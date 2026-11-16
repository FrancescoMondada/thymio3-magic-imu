"""A virtual Thymio 3 for running src/py/magic_mode.py off the robot.

It stands in for the `thymio` and `time` modules of MicroPython, with a virtual clock (sleep_ms advances time instead of waiting)
and the small physical model of thymio3-cards and thymio3-draw (src/sim/physics.js is its twin):

  * differential drive, wheel speed units -> mm/s;
  * the gyroscope integrates the heading in raw ticks (16384 per 90 degrees);
  * the hardware "15 cm" timer of the firmware (5 ticks per microsecond, the alarm stops the motors);
  * the firmware angle controller (angle_controller.c, KP 8, KD 2, 50 Hz) that rotate_deg_absolute() arms.

The straight-line controller is NOT here: it lives in the script under test, exactly as on the robot.

What the test drives: the accelerometer (`acc`), the two ground sensors (`ground`) and the buttons, at the start of every tick of
20 ms (`on_tick`). What it reads: the "@@" lines with their time, the tones and sounds, the LEDs, the pose.
"""
import math
import types

TICKS_PER_US = 5
ROT90 = 16384
MM_PER_S_PER_UNIT = 150.0 / 1.8 / 300.0      # the factory 15 cm = 9 000 000 ticks at speed 300
WHEEL_BASE_MM = 94.0
FACTORY_15CM = 9000000
RAD_TO_DEG = 180.0 / math.pi
G = 16384


class StopSim(Exception):
    pass


class Bank:
    def __init__(self, n):
        self.v = [0] * n


def acc_for_number(n, theta4=0.0, dirn=-1, tilt=0.0):
    """What the accelerometer reads for a robot held at number n in a vertical plane (the model of the mode's comment), `tilt` degrees
    out of that plane (the underside turned up or down)."""
    theta = math.radians(theta4 + dirn * (n - 4) * 45.0)
    plane = G * math.cos(math.radians(tilt))
    return [int(round(plane * math.cos(theta))), int(round(plane * math.sin(theta))), int(round(G * math.sin(math.radians(tilt))))]


FLAT = [0, 0, G]


class VirtualRobot:
    def __init__(self, dur_fw=FACTORY_15CM, rot_factor=0, ground=True, extra_leds=True):
        self.t_us = 0
        self.tick = 0
        self.x = 0.0                       # mm, +y is straight ahead at the start
        self.y = 0.0
        self.theta = 0.0                   # rad, counter-clockwise positive, 0 = facing +y
        self.vl = 0
        self.vr = 0
        self.angle_ticks = 0.0
        self.dur = [dur_fw, dur_fw]
        self.rot_factor = rot_factor
        self.rot90 = ROT90 + rot_factor
        self.has_ground = ground
        self.has_extra_leds = extra_leds
        self.timer_alarm = FACTORY_15CM
        self.timer_on = False
        self.timer_count = 0.0
        self.rot_active = False
        self.rot_target = 0
        self.rot_last_err = 0
        self.rot_max = 0
        self.rot_left = -500
        self.rot_right = 500
        # inputs the test drives
        self.buttons = [0, 0, 0, 0, 0]     # BACKWARD, LEFT, CENTER, FORWARD, RIGHT
        self.acc = list(FLAT)
        self.ground = [0, 0]
        self.on_tick = None                # callable(robot): sets the inputs of the tick that is about to run
        self.max_ticks = None
        self.no_tone = False               # a firmware without play_tone
        # outputs the test reads
        self.lines = []                    # (t_ms, text) of every "@@" line the mode printed
        self.sounds = []                   # (t_ms, id)
        self.tones = []                    # (t_ms, freq, tenths)
        self.rgb = [(0, 0, 0)] * 4
        self.circle = Bank(8)
        self.lego_f = Bank(8)
        self.lego_b = Bank(8)
        self.buttons_led = Bank(4)
        self.has_extra_leds = True
        self.circle_log = []               # (t_ms, [8 values]) at every change of the circle
        self.body_log = []                 # (t_ms, (r, g, b)) at every set_intensity of the first body LED
        self.behaviors_enabled = True
        self.speed_log = []                # (t_ms, vl, vr) at every set_speed
        self.rot_calls = []                # (t_ms, kind, angle, speed)
        self.poses = []                    # (t_ms, x, y, theta_deg) at the start of each tick
        self._next_fw = 20000
        self.print_buffer = ""

    # ---- physics ---------------------------------------------------------------------
    def now_ms(self):
        return self.t_us // 1000

    def heading_deg(self):
        return self.theta * RAD_TO_DEG

    def words(self, word):
        return [t for _, t in self.lines if t.split(" ")[0] == "@@" + word]

    def _fw_task(self):
        # AngleController_Update(), 50 Hz in the behavior task
        if not self.rot_active:
            return
        measure = int(self.angle_ticks)
        sign = 1 if self.rot_right > self.rot_left else -1
        num = self.rot_target - measure
        # C integer division by 182 truncates toward zero
        err = sign * (int(abs(num) // 182) * (1 if num >= 0 else -1))
        out = 8 * err + 2 * (err - self.rot_last_err)
        self.rot_last_err = err
        out = max(-self.rot_max, min(self.rot_max, out))
        l = int(out * self.rot_left / self.rot_max)
        r = int(out * self.rot_right / self.rot_max)
        self.vl, self.vr = l, r
        if out == 0:
            self.rot_active = False
            self.vl = self.vr = 0

    def step(self, dt_us=2000):
        dt = dt_us / 1e6
        self.t_us += dt_us
        k = MM_PER_S_PER_UNIT
        vl = self.vl * k
        vr = self.vr * k
        v = (vl + vr) / 2.0
        om = (vr - vl) / WHEEL_BASE_MM
        self.theta += om * dt
        self.x += -math.sin(self.theta) * v * dt
        self.y += math.cos(self.theta) * v * dt
        self.angle_ticks += (om * RAD_TO_DEG) * dt * (self.rot90 / 90.0)
        if self.timer_on:
            self.timer_count += dt_us * TICKS_PER_US
            if self.timer_count >= self.timer_alarm:
                self.timer_on = False
                self.timer_count = 0.0
                self.vl = self.vr = 0         # ISR_TimerExpired(): Common_SetTargetSpeed(0, 0)
        if self.t_us >= self._next_fw:
            self._next_fw += 20000
            self._fw_task()

    def advance_ms(self, ms):
        for _ in range(int(round(ms * 1000 / 2000))):
            self.step(2000)


def make_modules(robot):
    """Build fake `thymio` and `time` modules bound to a VirtualRobot."""

    class Behaviors:
        def disable_behaviors(self):
            robot.behaviors_enabled = False

        def enable_behaviors(self):
            robot.behaviors_enabled = True

    class Motors:
        def set_speed(self, l, r):
            if not isinstance(l, int) or not isinstance(r, int):
                raise TypeError("speeds must be int")
            if abs(l) > 1000 or abs(r) > 1000:
                raise ValueError("speed out of range")
            robot.vl, robot.vr = l, r
            robot.speed_log.append((robot.now_ms(), l, r))

        def get_left_speed(self):
            return int(robot.vl)

        def get_right_speed(self):
            return int(robot.vr)

        def get_distance_calibration(self):
            return list(robot.dur)

        def distance_calib_timer_set(self, ticks):
            robot.timer_alarm = int(ticks)

        def distance_calib_timer_reset(self):
            robot.timer_count = 0.0

        def distance_calib_timer_start(self):
            robot.timer_on = True

        def distance_calib_timer_pause(self):
            robot.timer_on = False

        def distance_calib_timer_get(self):
            return int(robot.timer_count)

    class Imu:
        def get_gyro_scale_calib(self):
            return robot.rot_factor

        def get_acc(self):
            return tuple(int(v) for v in robot.acc)

        def get_angle_raw(self):
            return int(robot.angle_ticks)

        def get_angle_deg(self):
            return int(robot.angle_ticks * 90 / robot.rot90)

        def reset_angle(self):
            robot.angle_ticks = 0.0

        def rotate_deg(self, angle, speed):
            robot.rot_calls.append((robot.now_ms(), "rel", angle, speed))
            if speed == 0:
                robot.rot_active = False          # StartWithSpeeds(): left == right -> not armed
                return
            raise NotImplementedError

        def rotate_deg_absolute(self, angle, speed):
            if not isinstance(angle, int) or not isinstance(speed, int):
                raise TypeError("angle and speed must be int")
            if not -32768 <= angle <= 32767 or not 0 <= speed <= 1000:
                raise ValueError("range")
            robot.rot_calls.append((robot.now_ms(), "abs", angle, speed))
            target = int(angle * robot.rot90 / 90)
            robot.rot_target = target
            robot.rot_max = speed
            if target - int(robot.angle_ticks) < 0:
                robot.rot_left, robot.rot_right = speed, -speed
            else:
                robot.rot_left, robot.rot_right = -speed, speed
            robot.rot_last_err = 0
            robot.rot_active = True

        def rotation_completed(self):
            return not robot.rot_active

    class Buttons:
        def get_status(self):
            return list(robot.buttons)

    class Sound:
        def stop(self):
            pass

        def play_onboard(self, i):
            robot.sounds.append((robot.now_ms(), i))

        def play_tone(self, freq, tenths):
            if robot.no_tone:
                raise AttributeError("play_tone")
            if not isinstance(freq, int) or not isinstance(tenths, int) or tenths < 0:
                raise ValueError("tone")
            robot.tones.append((robot.now_ms(), freq, tenths))

    class Rgb:
        def __init__(self, i):
            self.i = i

        def set_intensity(self, r, g, b):
            if not all(isinstance(v, int) and 0 <= v <= 16 for v in (r, g, b)):
                raise ValueError("RGB out of range %r" % ((r, g, b),))
            if self.i == 0 and robot.rgb[0] != (r, g, b):
                robot.body_log.append((robot.now_ms(), (r, g, b)))
            robot.rgb[self.i] = (r, g, b)

    class Led:
        def __init__(self, bank, i):
            self.bank, self.i = bank, i

        def intensity(self, v):
            if not isinstance(v, int) or not 0 <= v <= 16:
                raise ValueError("LED out of range %r" % (v,))
            if self.bank.v[self.i] != v:
                self.bank.v[self.i] = v
                robot.circle_log.append((robot.now_ms(), list(self.bank.v)))

    class Ground:
        def __init__(self, i):
            self.i = i

        def value(self):
            return int(robot.ground[self.i])

    th = types.ModuleType("thymio")
    th.BEHAVIORS = Behaviors
    th.MOTORS = Motors
    th.IMU = Imu
    th.BUTTONS = Buttons
    th.SOUND = Sound
    th.LEDS_RGB = Rgb
    th.LEDS_CIRCLE = lambda i: Led(robot.circle, i)
    if robot.has_extra_leds:
        class Quiet(Led):
            def intensity(self, v):
                if not isinstance(v, int) or not 0 <= v <= 16:
                    raise ValueError("LED out of range %r" % (v,))
                self.bank.v[self.i] = v
        th.LEDS_LEGO_FRONT = lambda i: Quiet(robot.lego_f, i)
        th.LEDS_LEGO_BACK = lambda i: Quiet(robot.lego_b, i)
        th.LEDS_BUTTON = lambda i: Quiet(robot.buttons_led, i)
    if robot.has_ground:
        th.GROUND = Ground                 # (a firmware without it: the mode must still run)
    th.get_battery_voltage = lambda: 4012

    tm = types.ModuleType("time")
    tm.ticks_ms = lambda: robot.t_us // 1000
    tm.ticks_us = lambda: robot.t_us
    tm.ticks_diff = lambda a, b: a - b

    def sleep_ms(n):
        robot.advance_ms(n)
        robot.tick += 1
        if robot.max_ticks is not None and robot.tick >= robot.max_ticks:
            raise StopSim()
        if robot.on_tick:
            robot.on_tick(robot)
        robot.poses.append((robot.now_ms(), robot.x, robot.y, robot.heading_deg()))

    tm.sleep_ms = sleep_ms
    return th, tm


def load(source, robot, extra=""):
    """Run the mode's source (plus `extra`, e.g. a final run(...)) on the virtual robot until max_ticks."""
    import sys
    thymio_mod, time_mod = make_modules(robot)

    def fake_print(*args, **kw):
        text = "".join(str(a) for a in args)
        robot.print_buffer += text
        while "\x1e" in robot.print_buffer:
            line, robot.print_buffer = robot.print_buffer.split("\x1e", 1)
            robot.lines.append((robot.now_ms(), line.strip()))

    saved = {k: sys.modules.get(k) for k in ("thymio", "time")}
    sys.modules["thymio"], sys.modules["time"] = thymio_mod, time_mod
    ns = {"print": fake_print, "__name__": "magic_mode"}
    if robot.on_tick:
        robot.on_tick(robot)                # the inputs of the first tick
    try:
        exec(compile(source + extra, "magic_mode.py", "exec"), ns)
    except StopSim:
        pass
    finally:
        for k, v in saved.items():
            if v is None:
                sys.modules.pop(k, None)
            else:
                sys.modules[k] = v
    return ns
