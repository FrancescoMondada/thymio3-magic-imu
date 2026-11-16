# Thymio 3 - the mind-reading trick, in MicroPython.
#
# The robot is placed on the prediction plate (eight positions, 0 at the bottom, then clockwise: 1 bottom-left, 2 left, 3 top-left,
# 4 top, 5 top-right, 6 right, 7 bottom-right), facing 0. A volunteer thinks of a number from 0 to 7. The magician picks the robot up
# and shows it to everybody, held upright in a vertical plane with its top (the buttons) towards him and its underside towards the audience,
# turned like the plate he sees: front up is 4, front to his right is 6, front down is 0, front to his left is 2. That is the transfer of
# the number.
#
#   1. WAIT    the accelerometer gives the direction of gravity in the robot's own plane: the number is that direction, in steps of 45
#              degrees, once the robot is (nearly) vertical and has stayed on one number for 0.5 s. The robot says it live.
#   2. LOCKED  a hand over the ground sensors (under the robot, which faces the volunteer) while the robot is vertical and its number
#              is steady: the number is frozen. Nothing the robot reads from then on can change it. (The circle LEDs chase once: the
#              robot "has read" the thought.)
#   3. READY   the robot is put down flat (accelerometer: gravity along its own vertical) for 0.5 s, on the plate, facing 0.
#              Lifted again, it goes back to LOCKED.
#   4. SHOW    the centre button (only when READY): the robot turns on the spot, clockwise, one full turn and then on in the same
#              direction up to its number (SPIN: one rotation of 360 + n x 45 degrees from the heading 0, by the gyroscope: the firmware
#              angle controller, so it turns at full speed and slows down on the number), the drive to the number along a straight line
#              held by the gyroscope (DRIVE), then music and blinking (FINALE), then the robot is back in WAIT, free for another volunteer.
#              The first show since the program started makes a MISTAKE: the rotation goes one number too far (360 + (n + 1) x 45), the
#              robot stays there 0.8 s, then turns back (anticlockwise) to the right number, and only then drives and plays. Later shows
#              go straight to the number. (Lifted before the mistake is made, the next show makes it again.)
#              Picked up in the middle of the show, it stops and goes back to LOCKED.
#   RESET      the robot turned on its back (upside down, 0.5 s) while LOCKED or READY forgets the number and goes back to WAIT: the
#              magician's hands are busy and the page is only to be looked at, so this is how a trick that went wrong is started again.
#
# The decoding of the accelerometer: with the robot's axes x forward and y to the left (Thymio 3: y is across, z is up and reads
# +16384 on the flat robot), the accelerometer reads gravity's opposite (the "up" vector) in the robot's frame, so for the robot held as
# described the reading (ax, ay) is (+,0) for 4, (0,-) for 6, (-,0) for 0, (0,+) for 2 (that is the MODEL, used by the virtual robot and the
# tests). The angle of (ax, ay) is turned into a number by theta4 (the angle that means 4: 0 by default) and dirn (+1 if the number grows
# with the angle, -1 by default). The first test on a real robot (2026-11-16) showed the model is half a turn off: front up read 0 and
# front to the magician's left read 2, so (ax, ay) is (-,0) for 4 and (0,+) for 2 and the page passes theta4 = 180 (-180), dirn = +1 to run(). It
# can measure both again with the robot held at 4 then at 6 (see "calibration" in the README): the sign convention of the axes was
# read from the firmware's source, not measured.
#
# The page and the robot talk through stdout (the page only listens; to change anything it starts the mode again with other arguments):
#   @@hello 1 / @@cfg theta4 dirn dist hand force sound / @@bat mV / @@lock n / @@placed / @@lifted / @@go n / @@phase name /
#   @@end n / @@abort why / @@reset / @@ignored why / @@bye
#   @@n ms state lock num flags ax ay az ground_left ground_right    every 100 ms: state 0 wait 1 locked 2 ready 3 spin 4 drive 5 finale,
#       lock = the frozen number (-1 none), num = the number read now (-1: not vertical), flags = 1 vertical, 2 flat, 4 hand, 8 number steady,
#       16 centre button pressed; the accelerometer (filtered) and the two ground sensors.
import thymio
import time

# written by the page when the whole mode is sent instead of the module (see run())
THETA4 = 0
DIRN = -1
DIST = 90
HAND = 300
FORCE = -1
SOUND = 1
SLIP = 1

# ---- constants -----------------------------------------------------------------
TICK_MS = 20            # the loop runs at 50 Hz
G = 16384               # 1 g on the raw accelerometer
VERT_AZ = 7000          # |az| below this: the robot is (nearly) vertical (within 25 degrees)
FLAT_AZ = 15000         # az above this and ax, ay small: the robot lies flat on its wheels (within 24 degrees)
FLAT_XY = 5000
LIFT_AZ = 10000         # during the show, az below this for LIFT_TICKS ticks: the robot has been picked up
LIFT_TICKS = 10
STABLE_TICKS = 25       # the same number for 0.5 s: steady
KEEP_TICKS = 100        # a steady number still counts 2 s after the robot stopped being steady (the hand is arriving)
HAND_TICKS = 10         # a hand for 0.2 s
HAND_OFF_PCT = 60       # the hand has gone below this percent of the threshold
FLAT_TICKS = 25         # flat for 0.5 s: put down
UNREADY_TICKS = 10      # not flat for 0.2 s while READY: lifted
HYST = 0.15             # a number changes only when the angle is 0.65 of a sector (29 degrees) away from the middle of the old one
FILTER = 0.4            # the accelerometer is smoothed: new = old + 0.4 x (reading - old)
SPIN_SPEED = 500        # the full turn, clockwise
UPSIDE_AZ = -13000      # az below this: the robot is on its back (as in the firmware's Sequence mode: erase all)
UPSIDE_TICKS = 25       # for 0.5 s: forget the number
DRIVE_SPEED = 200
TICKS_PER_S = 5000000   # hardware timer ticks per second (5 per microsecond)
TAU300_S = 0.115        # start-up and braking loss of a move at speed 300, measured on a real robot (thymio3-draw)
GUARD_TICKS = 150000    # the last 30 ms of a move belong to the hardware timer
STOP_MS = 500           # pause after the move
PAUSE_TICKS = 15        # pause between the parts of the show
SLIP_PAUSE_TICKS = 40   # the pause after the mistake (0.8 s), before the robot goes back to the right number
TURN_TIMEOUT = 750      # a turn that has not finished after 15 s is given up (each turn of the show has its own 15 s)
S_KP = 0.1              # straight controller (straight_controller.c, as in thymio3-cards and thymio3-draw)
S_KI = 0.2
S_MAX_I = 1000.0
S_LIMIT = 600.0
ROT90_NOMINAL = 16384
MAXB = 16
NET_TICKS = 5           # @@n every 100 ms
BLINK_TICKS = 15
BLINKS = 12             # toggles of the finale
SND_END = 11            # TONE_TYPE_DRAW_END, if the tone player is not there
# the jingle: (frequency in Hz, duration in tenths of a second)
JINGLE = ((523, 2), (659, 2), (784, 2), (1047, 5), (784, 2), (880, 2), (988, 2), (1175, 5), (1047, 2), (1175, 2), (1319, 10))

ST_WAIT = 0
ST_LOCKED = 1
ST_READY = 2
ST_SPIN = 3
ST_DRIVE = 4
ST_FINALE = 5
STATE_NAMES = ("wait", "locked", "ready", "spin", "drive", "finale")

F_VERT = 1
F_FLAT = 2
F_HAND = 4
F_STEADY = 8
F_BTN = 16

# ---- hardware -------------------------------------------------------------------
beh = thymio.BEHAVIORS()
mot = thymio.MOTORS()
imu = thymio.IMU()
btn = thymio.BUTTONS()
snd = thymio.SOUND()
rgb = [thymio.LEDS_RGB(i) for i in range(4)]
circle = [thymio.LEDS_CIRCLE(i) for i in range(8)]
try:
    ground = [thymio.GROUND(0), thymio.GROUND(1)]
except Exception:
    ground = None           # a robot without them: the hand cannot be seen (the page can still force a number)
# the other LEDs, only to switch them off (the robot stays dark until something happens); a firmware without one of them goes on without it
others = []
for _name, _count in (("LEDS_LEGO_FRONT", 8), ("LEDS_LEGO_BACK", 8), ("LEDS_BUTTON", 4)):
    try:
        others += [getattr(thymio, _name)(i) for i in range(_count)]
    except Exception:
        pass


def say(*parts):
    # The firmware sends stdout in batches: at 100 bytes, or after a second without output. A line padded to 100 bytes goes out at
    # once, ended by \x1e (record separator) instead of a newline that would only follow in the next batch.
    s = "@@" + " ".join([str(p) for p in parts])
    print(s + " " * (99 - len(s)) + "\x1e", end="")


def tdiv(a, b):
    # C integer division (truncates toward zero)
    q = abs(a) // abs(b)
    return q if (a < 0) == (b < 0) else -q


def clamp(v, limit):
    if limit < 0:
        limit = -limit
    if v > limit:
        return limit
    if v < -limit:
        return -limit
    return v


def atan1(z):
    # atan of z in 0..1, in degrees (error < 0.1 degree)
    return 57.29578 * (0.7853982 * z - z * (z - 1.0) * (0.2447 + 0.0663 * z))


def atan2_deg(y, x):
    # the angle of the vector (x, y) in degrees, -180..180 (counter-clockwise from +x)
    ax = abs(x)
    ay = abs(y)
    if ax == 0 and ay == 0:
        return 0.0
    if ax >= ay:
        a = atan1(ay / ax)
    else:
        a = 90.0 - atan1(ax / ay)
    if x < 0:
        a = 180.0 - a
    if y < 0:
        a = -a
    return a


def wrap180(a):
    return (a + 180.0) % 360.0 - 180.0


def drive_ticks(dist_mm, speed, dur15):
    # How long (in hardware timer ticks) to run at `speed` for `dist_mm`, from the robot's own calibration (dur15: the ticks it takes
    # to drive 15 cm at speed 300) and the loss at start and stop that the calibration contains.
    secs15 = dur15 / float(TICKS_PER_S)
    run = secs15 - TAU300_S
    if run < 0.2:
        run = 0.2
    k = 150.0 / (300.0 * run)           # mm per second per unit of speed
    t = dist_mm / (speed * k) + TAU300_S * speed / 300.0
    return int(t * TICKS_PER_S)


def play_tone(freq, tenths):
    try:
        snd.play_tone(freq, tenths)
        return True
    except Exception:
        return False


def play_sound(sound_id):
    try:
        snd.stop()
    except Exception:
        pass
    try:
        snd.play_onboard(sound_id)
    except Exception:
        pass


class Edge:
    def __init__(self):
        self.prev = 0

    def __call__(self, cond):
        c = 1 if cond else 0
        r = c and not self.prev
        self.prev = c
        return r


class Magic:
    def __init__(self, theta4, dirn, dist, hand, force, sound, slip=1):
        self.theta4 = theta4
        self.dirn = 1 if dirn > 0 else -1
        self.dist = dist
        self.hand_on = hand
        self.sound = sound
        self.state = ST_WAIT
        self.ticks = 0
        self.t0 = time.ticks_ms()
        self.rot90 = ROT90_NOMINAL + int(imu.get_gyro_scale_calib())
        cal = mot.get_distance_calibration()
        self.dur15 = int(cal[0])
        # the senses
        self.fx = 0.0
        self.fy = 0.0
        self.fz = float(G)
        self.first = True
        self.cur = None             # the number read now (with its hysteresis), None: not vertical
        self.cand = None
        self.same = 0
        self.steady = None          # the last number that was steady
        self.steady_age = KEEP_TICKS + 1
        self.vertical = False
        self.flat = False
        self.hand_seen = False
        self.hand_n = 0
        self.flat_n = 0
        self.unready_n = 0
        self.lift_n = 0
        self.upside_n = 0
        self.gl = 0
        self.gr = 0
        self.pressed = 0
        # the frozen number
        self.lock = -1
        self.anim = 0
        # the show
        self.heading = 0
        self.slip_left = slip != 0   # the first show since the program started goes one number too far (until the audience has seen it)
        self.slipping = False        # this show does
        self.phase = 0               # of the turn: 0 on its way, 1 stopped one number too far, 2 coming back
        self.final = 0               # the heading of the right number
        self.delay = 0
        self.wait_n = 0
        self.motion_in_progress = False
        self.motion_running = False
        self.t_stop = 0
        self.alarm = 0
        self.last_el = 0
        self.t_move = 0
        self.s_on = False
        self.s_target = 0
        self.s_base = 0
        self.s_maxcorr = 0.0
        self.s_int = 0.0
        self.s_last_us = 0
        self.note_i = 0
        self.note_at = 0
        self.tone_ok = True
        self.blinks = 0
        self.blink_n = 0
        # lights (written only when they change)
        self.lit = -1
        self.glow = None
        self.e_centre = Edge()
        if 0 <= force <= 7:
            self.lock = force
            self.state = ST_LOCKED
            say("lock", force, "forced")

    # ---- the senses ---------------------------------------------------------------------
    def sector(self, ax, ay):
        # The number the direction of gravity in the robot's plane stands for (the middle of its 45 degree sector), with a margin: the
        # old number stays until the angle is HYST beyond the edge of its sector.
        th = atan2_deg(ay, ax)
        kf = self.dirn * wrap180(th - self.theta4) / 45.0
        if self.cur is not None:
            d = (kf - (self.cur - 4) + 4.0) % 8.0 - 4.0
            if abs(d) <= 0.5 + HYST:
                return self.cur
        return (4 + int(kf + 8.5) - 8) % 8

    def read_senses(self):
        acc = imu.get_acc()
        if self.first:
            self.fx = float(acc[0])
            self.fy = float(acc[1])
            self.fz = float(acc[2])
            self.first = False
        else:
            self.fx += (acc[0] - self.fx) * FILTER
            self.fy += (acc[1] - self.fy) * FILTER
            self.fz += (acc[2] - self.fz) * FILTER
        ax = int(self.fx)
        ay = int(self.fy)
        az = int(self.fz)
        self.ax = ax
        self.ay = ay
        self.az = az
        self.vertical = abs(az) < VERT_AZ
        self.flat = az > FLAT_AZ and abs(ax) < FLAT_XY and abs(ay) < FLAT_XY
        # the number, and whether it has been the same for a while
        if self.vertical:
            n = self.sector(ax, ay)
            self.cur = n
            if n == self.cand:
                self.same += 1
            else:
                self.cand = n
                self.same = 1
        else:
            self.cur = None
            self.cand = None
            self.same = 0
        if self.same >= STABLE_TICKS:
            self.steady = self.cur
            self.steady_age = 0
        elif self.steady_age <= KEEP_TICKS:
            self.steady_age += 1
        # the hand under the robot (hysteresis: on at the threshold, off below 60 % of it)
        if ground:
            try:
                self.gl = ground[0].value()
                self.gr = ground[1].value()
            except Exception:
                self.gl = 0
                self.gr = 0
        level = self.gl if self.gl > self.gr else self.gr
        if level >= self.hand_on:
            self.hand_seen = True
        elif level * 100 < self.hand_on * HAND_OFF_PCT:
            self.hand_seen = False
        if self.hand_seen:
            self.hand_n += 1
        else:
            self.hand_n = 0
        # put down flat, or on its back
        if self.flat:
            self.flat_n += 1
        else:
            self.flat_n = 0
        if az <= UPSIDE_AZ:
            self.upside_n += 1
        else:
            self.upside_n = 0

    def usable(self):
        # the number to freeze: the one that was steady, if it was steady recently
        if self.steady is not None and self.steady_age <= KEEP_TICKS:
            return self.steady
        return None

    def flags(self):
        f = 0
        if self.vertical:
            f |= F_VERT
        if self.flat:
            f |= F_FLAT
        if self.hand_seen:
            f |= F_HAND
        if self.same >= STABLE_TICKS:
            f |= F_STEADY
        if self.pressed:
            f |= F_BTN
        return f

    # ---- the states -------------------------------------------------------------------
    def set_state(self, state):
        self.state = state
        self.wait_n = 0
        self.delay = 0
        say("phase", STATE_NAMES[state])

    def do_wait(self, press):
        if self.vertical and self.hand_n >= HAND_TICKS:
            n = self.usable()
            if n is None:
                if self.hand_n == HAND_TICKS:
                    say("ignored", "unsteady")
                return
            self.freeze(n)
        elif press:
            say("ignored", "nolock")

    def freeze(self, n):
        self.lock = n
        self.anim = 0
        say("lock", n)
        self.set_state(ST_LOCKED)
        if self.sound:
            play_tone(1175, 2)

    def do_locked(self, press):
        self.anim += 1
        if self.upside_n >= UPSIDE_TICKS:
            self.forget()
            return
        if press:
            say("ignored", "notflat")
        if self.flat_n >= FLAT_TICKS:
            self.unready_n = 0
            say("placed")
            self.set_state(ST_READY)

    def do_ready(self, press):
        self.anim += 1
        if self.upside_n >= UPSIDE_TICKS:
            self.forget()
            return
        if self.flat:
            self.unready_n = 0
        else:
            self.unready_n += 1
            if self.unready_n >= UNREADY_TICKS:
                say("lifted")
                self.set_state(ST_LOCKED)
                return
        if press:
            self.begin_show()

    def forget(self):
        # on its back: the number is forgotten (a short low tone says so)
        say("reset")
        if self.sound:
            play_tone(440, 3)
        self.reset()

    def reset(self):
        # back to WAIT, free for the next volunteer
        self.lock = -1
        self.steady = None
        self.steady_age = KEEP_TICKS + 1
        self.hand_n = 0
        self.set_state(ST_WAIT)

    # ---- the show ---------------------------------------------------------------------------
    def begin_show(self):
        say("go", self.lock)
        imu.reset_angle()
        # one rotation, clockwise: a full turn and then on to the number (0 to 7 x 45 degrees)
        self.final = -(360 + 45 * self.lock)
        self.slipping = self.slip_left
        self.phase = 0
        if self.slipping:
            # the first time it "makes a mistake": on to the next number (the one after 7 is 0, one more lap)
            self.heading = -(360 + 45 * (self.lock + 1))
        else:
            self.heading = self.final
        imu.rotate_deg_absolute(self.heading, SPIN_SPEED)
        self.lift_n = 0
        self.set_state(ST_SPIN)

    def stop_motion(self):
        mot.distance_calib_timer_pause()
        mot.set_speed(0, 0)
        imu.rotate_deg(0, 0)
        mot.set_speed(0, 0)
        self.s_on = False
        self.motion_running = False
        self.motion_in_progress = False

    def abort_show(self, why):
        self.stop_motion()
        say("abort", why)
        self.anim = 100
        self.flat_n = 0
        self.set_state(ST_LOCKED)

    def do_show(self):
        st = self.state
        # picked up: stop, whatever the show was doing
        if self.az < LIFT_AZ:
            self.lift_n += 1
            if self.lift_n >= LIFT_TICKS:
                self.abort_show("lifted")
                return
        else:
            self.lift_n = 0
        self.wait_n += 1
        if st == ST_SPIN:
            if self.phase == 1:
                # it has gone one number too far and stays there a moment
                self.delay += 1
                if self.delay >= SLIP_PAUSE_TICKS:
                    # then back, the short way (anticlockwise), to the right number
                    self.heading = self.final
                    imu.rotate_deg_absolute(self.heading, SPIN_SPEED)
                    self.phase = 2
                    self.wait_n = 0
                    self.delay = 0
                return
            done = imu.rotation_completed()
            if not done and self.wait_n > TURN_TIMEOUT:
                imu.rotate_deg(0, 0)
                done = True
            if done and self.wait_n > 1:
                if self.phase == 0 and self.slipping:
                    # the mistake has been made, and seen: it will not be made again until the program is started again
                    self.slip_left = False
                    self.phase = 1
                    self.delay = 0
                else:
                    self.delay += 1
                    if self.delay >= PAUSE_TICKS:
                        self.drive()
        elif st == ST_DRIVE:
            if not self.motion_in_progress:
                self.finale()

    def drive(self):
        self.set_state(ST_DRIVE)
        self.start_move(drive_ticks(self.dist, DRIVE_SPEED, self.dur15))

    def finale(self):
        self.set_state(ST_FINALE)
        self.note_i = 0
        self.note_at = time.ticks_ms()
        self.tone_ok = True
        self.blinks = 0
        self.blink_n = 0
        set_circle(MAXB)
        set_body(MAXB, MAXB, MAXB)
        self.lit = -1
        self.glow = None

    def do_finale(self):
        now = time.ticks_ms()
        if self.sound and self.note_i < len(JINGLE) and time.ticks_diff(now, self.note_at) >= 0:
            freq, tenths = JINGLE[self.note_i]
            if self.tone_ok and not play_tone(freq, tenths):
                self.tone_ok = False
                play_sound(SND_END)
            self.note_i += 1
            self.note_at = now + tenths * 100
        self.blink_n += 1
        if self.blink_n >= BLINK_TICKS and self.blinks < BLINKS:
            self.blink_n = 0
            self.blinks += 1
            on = (self.blinks & 1) == 0
            set_circle(MAXB if on else 0)
            if on:
                set_body(MAXB, MAXB // 2, 0)
            else:
                set_body(0, MAXB // 2, MAXB)
        sound_done = (not self.sound) or (self.note_i >= len(JINGLE) and time.ticks_diff(now, self.note_at) >= 300)
        if self.blinks >= BLINKS and sound_done:
            set_circle(0)
            set_body(0, 0, 0)
            n = self.lock
            say("end", n)
            self.reset()

    # ---- straight controller (straight_controller.c, as in thymio3-draw) ------------------------
    def straight_start(self, heading_deg, speed):
        self.s_target = tdiv(heading_deg * self.rot90, 90)
        self.s_base = speed
        self.s_maxcorr = float(abs(speed))
        self.s_int = 0.0
        self.s_last_us = time.ticks_us()
        self.s_on = True

    def apply_speeds(self, base, corr):
        left = base - corr
        right = base + corr
        over = (left if left > right else right) - S_LIMIT
        if over > 0:
            left -= over
            right -= over
        under = -S_LIMIT - (left if left < right else right)
        if under > 0:
            left += under
            right += under
        mot.set_speed(int(left - 0.5) if left < 0 else int(left + 0.5),
                      int(right - 0.5) if right < 0 else int(right + 0.5))

    def straight_update(self):
        if not self.s_on:
            return
        if not self.motion_running:
            self.s_on = False
            return
        # the hardware timer ends the move (and stops the motors by itself)
        el = mot.distance_calib_timer_get()
        late = time.ticks_diff(time.ticks_ms(), self.t_move) > self.alarm // 5000 + 150
        done = el >= self.alarm or el < self.last_el or late
        self.last_el = el
        if done:
            self.end_move()
            return
        if el >= self.alarm - GUARD_TICKS:
            return
        now = time.ticks_us()
        dt = time.ticks_diff(now, self.s_last_us) / 1000000.0
        self.s_last_us = now
        if dt <= 0.0 or dt > 0.1:
            dt = 0.02
        err = self.s_target - imu.get_angle_raw()
        self.s_int = clamp(self.s_int + err * dt, S_MAX_I)
        corr = clamp(S_KP * err + S_KI * self.s_int, self.s_maxcorr)
        self.apply_speeds(self.s_base, corr)

    def start_move(self, dur):
        mot.distance_calib_timer_set(dur)
        mot.distance_calib_timer_reset()
        mot.distance_calib_timer_start()
        self.alarm = dur
        self.last_el = 0
        self.t_move = time.ticks_ms()
        self.motion_in_progress = True
        self.motion_running = True
        self.straight_start(self.heading, DRIVE_SPEED)
        self.straight_update()

    def end_move(self):
        self.motion_running = False
        self.s_on = False
        mot.set_speed(0, 0)
        mot.distance_calib_timer_pause()
        self.t_stop = time.ticks_ms()

    # ---- lights ---------------------------------------------------------------------------
    def lights(self):
        st = self.state
        if st == ST_LOCKED or st == ST_READY:
            a = self.anim
            # the circle fills clockwise in 0.64 s, stays lit 0.4 s, goes out
            n = a // 4 + 1 if a < 32 else 8 if a < 52 else 0
            if n != self.lit:
                self.lit = n
                for i in range(8):
                    circle[i].intensity(MAXB if i < n else 0)
            glow = (0, 0, 3) if st == ST_LOCKED else (0, 4, 0)
        elif st == ST_FINALE:
            return
        else:
            if self.lit != 0:
                self.lit = 0
                set_circle(0)
            glow = (0, 0, 0)
        if glow != self.glow:
            self.glow = glow
            set_body(glow[0], glow[1], glow[2])

    # ---- one tick ---------------------------------------------------------------------------
    def tick(self):
        status = btn.get_status()               # [BACKWARD, LEFT, CENTER, FORWARD, RIGHT]
        self.pressed = 1 if status[2] else 0
        press = self.e_centre(status[2])
        self.read_senses()
        st = self.state
        if st == ST_WAIT:
            self.do_wait(press)
        elif st == ST_LOCKED:
            self.do_locked(press)
        elif st == ST_READY:
            self.do_ready(press)
        elif st == ST_FINALE:
            self.do_finale()
        else:
            self.do_show()
        self.lights()
        self.straight_update()
        if self.motion_in_progress and not self.motion_running:
            if time.ticks_diff(time.ticks_ms(), self.t_stop) >= STOP_MS:
                self.motion_in_progress = False
        self.ticks += 1
        if self.ticks % NET_TICKS == 0:
            self.report_n()

    def report_n(self):
        num = self.cur if self.cur is not None else -1
        say("n", time.ticks_diff(time.ticks_ms(), self.t0), self.state, self.lock, num, self.flags(),
            self.ax, self.ay, self.az, self.gl, self.gr)


def set_body(r, g, b):
    for i in range(4):
        rgb[i].set_intensity(r, g, b)


def set_circle(v):
    for i in range(8):
        circle[i].intensity(v)


def lights_off():
    set_body(0, 0, 0)
    set_circle(0)
    for led in others:
        try:
            led.intensity(0)
        except Exception:
            pass


def cleanup():
    # whatever happened (the page stopped the script, an error): stop the motors, cancel a turn, switch the LEDs off, give the robot back
    try:
        mot.distance_calib_timer_pause()
        mot.set_speed(0, 0)
        imu.rotate_deg(0, 0)
        mot.set_speed(0, 0)
        lights_off()
        snd.stop()
    except Exception:
        pass
    finally:
        beh.enable_behaviors()
        say("bye")


def run(theta4=None, dirn=None, dist=None, hand=None, force=None, sound=None, slip=None):
    # theta4: the angle (degrees) of the accelerometer's (ax, ay) that means 4; dirn: +1 if the number grows with that angle, -1 if it
    # shrinks; dist: the drive to the number, in mm; hand: the ground sensors' reading that means a hand; force: a number (0..7) to
    # freeze at once (the page's way out when the validation did not work), -1 for none; sound: the jingle and the beep; slip: 1 (the page
    # does not ask) if the first show since the program started goes one number too far, stops, and comes back, 0 for none
    if theta4 is None:
        theta4 = THETA4
    if dirn is None:
        dirn = DIRN
    if dist is None:
        dist = DIST
    if hand is None:
        hand = HAND
    if force is None:
        force = FORCE
    if sound is None:
        sound = SOUND
    if slip is None:
        slip = SLIP
    beh.disable_behaviors()
    try:
        lights_off()
        m = Magic(theta4, dirn, dist, hand, force, sound, slip)
        say("hello", 1)
        say("cfg", theta4, m.dirn, dist, hand, force, sound)
        say("bat", thymio.get_battery_voltage())
        while True:
            t0 = time.ticks_ms()
            m.tick()
            left = TICK_MS - time.ticks_diff(time.ticks_ms(), t0)
            if left > 0:
                time.sleep_ms(left)
    finally:
        cleanup()
