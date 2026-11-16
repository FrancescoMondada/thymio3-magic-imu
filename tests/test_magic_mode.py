"""Tests of src/py/magic_mode.py on a virtual robot.

    python3 -I tests/test_magic_mode.py                              (from the project root)
    python3 -I tests/test_magic_mode.py --golden tests/golden-magic.json

--golden writes the inputs of a few scenarios (the eight numbers, a calibrated robot, a hand too early, a robot picked up in the middle of
the show, a number forced by the page...) and what the Python mode did with them; tests/magic.test.js compares the JavaScript twin of the
mode (src/sim/magic-mode.js) against it.
"""
import json
import math
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fake_magic_robot import VirtualRobot, StopSim, load, acc_for_number, FLAT, G, MM_PER_S_PER_UNIT  # noqa: E402

SOURCE = open(os.path.join(HERE, "..", "src", "py", "magic_mode.py")).read()
TICK_MS = 20
NAMES = ("wait", "locked", "ready", "spin", "drive", "finale")
HAND = [900, 850]          # a hand on the underside
NOHAND = [0, 0]


class Script:
    """What the sensors say, as a list of changes at given times (seconds)."""

    def __init__(self):
        self.events = []                   # (ms, {acc, ground, centre})

    def at(self, t, acc=None, ground=None, centre=None):
        change = {}
        if acc is not None:
            change["acc"] = [int(v) for v in acc]
        if ground is not None:
            change["ground"] = [int(v) for v in ground]
        if centre is not None:
            change["centre"] = 1 if centre else 0
        self.events.append((int(round(t * 1000)), change))
        return self

    def press(self, t, ms=100):
        self.at(t, centre=True)
        self.at(t + ms / 1000.0, centre=False)
        return self

    def driver(self):
        events = sorted(self.events, key=lambda e: e[0])
        state = {"i": 0}

        def on_tick(robot):
            now = robot.now_ms()
            while state["i"] < len(events) and events[state["i"]][0] <= now:
                change = events[state["i"]][1]
                state["i"] += 1
                if "acc" in change:
                    robot.acc = list(change["acc"])
                if "ground" in change:
                    robot.ground = list(change["ground"])
                if "centre" in change:
                    robot.buttons[2] = change["centre"]
        return on_tick


def parse_n(line):
    a = line.split()
    assert a[0] == "@@n", line
    v = [int(x) for x in a[1:]]
    keys = ("ms", "state", "lock", "num", "flags", "ax", "ay", "az", "gl", "gr")
    d = dict(zip(keys, v))
    d["name"] = NAMES[d["state"]]
    return d


def run(script, seconds, args="", **robot_kw):
    robot = VirtualRobot(**robot_kw)
    robot.on_tick = script.driver()
    robot.max_ticks = int(seconds * 1000 / TICK_MS)
    load(SOURCE, robot, "\nrun(%s)\n" % args)
    return robot


def ns(robot):
    return [parse_n(t) for t in robot.words("n")]


def phases(robot):
    return [(ms, t.split()[1]) for ms, t in robot.lines if t.startswith("@@phase")]


def full_show(n, t_hold=1.5, args="", acc=None, ground=HAND, press_at=None):
    """Hold at n, a hand arrives, the robot is put down, the centre button is pressed."""
    s = Script()
    a = acc or acc_for_number(n)
    s.at(0, acc=FLAT, ground=NOHAND)
    s.at(0.5, acc=a)                        # picked up and shown
    s.at(0.5 + t_hold, ground=ground)       # the volunteer's hand
    s.at(0.5 + t_hold + 1.0, ground=NOHAND, acc=[3000, 2000, 9000])   # hand away, the robot is brought down
    s.at(0.5 + t_hold + 1.4, acc=FLAT)      # on the plate
    press = press_at if press_at is not None else 0.5 + t_hold + 3.0
    s.press(press)
    return s, press


class Decoding(unittest.TestCase):
    def test_atan2_matches_math(self):
        ns_ = {}
        exec(compile(SOURCE.split("# ---- hardware")[0], "m", "exec"), {"thymio": None, "time": None, "__name__": "x"}, ns_) if False else None
        # the mode's own atan2_deg, with a fake hardware so that the module loads
        robot = VirtualRobot()
        space = load(SOURCE, robot, "")
        worst = 0.0
        for deg in range(-180, 181):
            for r in (1, 1000, 16000):
                x, y = r * math.cos(math.radians(deg)), r * math.sin(math.radians(deg))
                want = math.degrees(math.atan2(y, x))
                got = space["atan2_deg"](y, x)
                diff = abs((got - want + 180) % 360 - 180)
                worst = max(worst, diff)
        self.assertLess(worst, 0.2)
        self.assertEqual(space["atan2_deg"](0, 0), 0.0)

    def test_drive_ticks(self):
        space = load(SOURCE, VirtualRobot(), "")
        # factory calibration, speed 300, 150 mm: the 15 cm of the calibration
        self.assertAlmostEqual(space["drive_ticks"](150, 300, 9000000) / 5e6, 1.8, places=2)
        # a shorter drive is shorter, a slower one longer
        self.assertLess(space["drive_ticks"](60, 200, 9000000), space["drive_ticks"](90, 200, 9000000))
        self.assertLess(space["drive_ticks"](90, 300, 9000000), space["drive_ticks"](90, 200, 9000000))
        # a robot whose 15 cm take longer: longer
        self.assertLess(space["drive_ticks"](90, 200, 9000000), space["drive_ticks"](90, 200, 9900000))

    def test_every_number_is_read(self):
        for n in range(8):
            s = Script().at(0, acc=FLAT).at(0.4, acc=acc_for_number(n))
            r = run(s, 3.0)
            last = ns(r)[-1]
            self.assertEqual(last["num"], n, "number %d" % n)
            self.assertTrue(last["flags"] & 1, "vertical")
            self.assertTrue(last["flags"] & 8, "steady after 0.5 s")
            self.assertEqual(last["name"], "wait")

    def test_the_documented_poses(self):
        # (ax, ay) for front up / right / down / left: 4, 6, 0, 2 (the mode's comment)
        for (ax, ay), want in (((G, 0), 4), ((0, -G), 6), ((-G, 0), 0), ((0, G), 2), ((11585, -11585), 5), ((-11585, 11585), 1)):
            s = Script().at(0, acc=[ax, ay, 0])
            self.assertEqual(ns(run(s, 1.0))[-1]["num"], want, (ax, ay))

    def test_out_of_plane_tilt(self):
        for tilt in (-24, -10, 10, 24):
            for n in range(8):
                s = Script().at(0, acc=acc_for_number(n, tilt=tilt))
                self.assertEqual(ns(run(s, 1.0))[-1]["num"], n, "number %d tilt %d" % (n, tilt))
        # tilted by 35 degrees: not vertical any more, no number
        s = Script().at(0, acc=acc_for_number(3, tilt=35))
        last = ns(run(s, 1.0))[-1]
        self.assertEqual(last["num"], -1)
        self.assertFalse(last["flags"] & 1)

    def test_flat_has_no_number(self):
        last = ns(run(Script().at(0, acc=FLAT), 1.0))[-1]
        self.assertEqual(last["num"], -1)
        self.assertTrue(last["flags"] & 2)
        self.assertFalse(last["flags"] & 1)

    def test_calibrated_mapping(self):
        # a robot whose axes are the other way round: the page measured 4 at 37 degrees and the numbers growing with the angle
        for n in range(8):
            s = Script().at(0, acc=acc_for_number(n, theta4=37, dirn=1))
            r = run(s, 1.0, "37, 1")
            self.assertEqual(ns(r)[-1]["num"], n, "number %d" % n)
        self.assertEqual(run(Script().at(0, acc=FLAT), 0.2, "-20, 1").words("cfg"), ["@@cfg -20 1 90 300 -1 1"])

    def test_hysteresis(self):
        # an angle that wobbles by +-10 degrees across the edge between 4 and 5 does not make the number flicker
        # the edge between 4 and 5 is at -22.5 degrees of theta (default mapping)
        s = Script().at(0, acc=acc_for_number(4))
        for i in range(60):
            theta = -22.5 + (10 if i % 2 else -10) * 0.5
            a = [int(G * math.cos(math.radians(theta))), int(G * math.sin(math.radians(theta))), 0]
            s.at(0.5 + i * 0.04, acc=a)
        r = run(s, 3.2)
        seen = [d["num"] for d in ns(r) if d["ms"] > 600]
        self.assertLessEqual(len(set(seen)), 2)
        changes = sum(1 for a, b in zip(seen, seen[1:]) if a != b)
        self.assertLessEqual(changes, 1)


class Validation(unittest.TestCase):
    def test_hand_locks_the_steady_number(self):
        for n in range(8):
            s = Script().at(0, acc=acc_for_number(n)).at(2.0, ground=HAND)
            r = run(s, 3.5)
            self.assertEqual(r.words("lock"), ["@@lock %d" % n], "number %d" % n)
            self.assertEqual(ns(r)[-1]["lock"], n)
            self.assertEqual(ns(r)[-1]["name"], "locked")

    def test_the_lock_is_frozen(self):
        s = Script().at(0, acc=acc_for_number(5)).at(2.0, ground=HAND).at(3.0, acc=acc_for_number(1)).at(4.0, acc=acc_for_number(7))
        r = run(s, 6.0)
        self.assertEqual({d["lock"] for d in ns(r) if d["name"] == "locked"}, {5})
        self.assertEqual(ns(r)[-1]["num"], 7)         # what it reads now is still shown, but it is not the lock

    def test_a_hand_before_the_number_is_steady_is_not_enough(self):
        s = Script().at(0, acc=FLAT, ground=NOHAND).at(0.2, acc=acc_for_number(3), ground=HAND)
        r = run(s, 0.55)                 # 0.35 s since the robot was held: not steady (0.5 s)
        self.assertEqual(r.words("lock"), [])
        self.assertEqual(r.words("ignored"), ["@@ignored unsteady"])
        r = run(s, 1.5)                  # the hand is still there when it becomes steady: locked at once
        self.assertEqual(r.words("lock"), ["@@lock 3"])

    def test_a_steady_number_counts_for_two_seconds(self):
        # shown for a second, then the robot tilts to the side while the hand arrives, 1.5 s later
        s = Script().at(0, acc=acc_for_number(6)).at(1.0, acc=acc_for_number(6, tilt=35)).at(2.5, ground=HAND)
        r = run(s, 4.0)
        self.assertEqual(r.words("lock"), [])          # tilted: not vertical, so no validation

    def test_a_hand_while_lying_flat_does_nothing(self):
        s = Script().at(0, acc=FLAT).at(1.0, ground=HAND)
        r = run(s, 3.0)
        self.assertEqual(r.words("lock"), [])
        self.assertEqual(ns(r)[-1]["name"], "wait")
        self.assertTrue(ns(r)[-1]["flags"] & 4)          # but the hand is seen

    def test_the_hand_threshold(self):
        weak = [200, 150]
        s = Script().at(0, acc=acc_for_number(2)).at(1.5, ground=weak)
        self.assertEqual(run(s, 3.0).words("lock"), [])
        self.assertEqual(run(s, 3.0, "0, -1, 90, 150").words("lock"), ["@@lock 2"])
        # one sensor is enough
        s = Script().at(0, acc=acc_for_number(2)).at(1.5, ground=[0, 700])
        self.assertEqual(run(s, 3.0).words("lock"), ["@@lock 2"])

    def test_hand_hysteresis(self):
        s = Script().at(0, acc=acc_for_number(2)).at(1.5, ground=[310, 0]).at(1.6, ground=[250, 0])
        r = run(s, 2.2)
        # 250 is above 60 % of 300: the hand is still there
        self.assertTrue(ns(r)[-1]["flags"] & 4)

    def test_the_circle_chases_and_a_tone_is_played(self):
        s = Script().at(0, acc=acc_for_number(2)).at(1.5, ground=HAND)
        r = run(s, 4.0)
        self.assertTrue(r.tones and r.tones[0][1] == 1175)
        counts = [sum(1 for v in c if v) for _, c in r.circle_log]
        self.assertEqual(counts[:8], [1, 2, 3, 4, 5, 6, 7, 8])
        self.assertEqual(counts[8:16], [7, 6, 5, 4, 3, 2, 1, 0])          # (one LED at a time goes out)
        # the body glows blue while locked
        self.assertIn((0, 0, 3), [c for _, c in r.body_log])

    def test_forced_number(self):
        s = Script().at(0, acc=acc_for_number(2))              # held up: locked (the number read is 2, the forced one 5)
        r = run(s, 1.0, "0, -1, 90, 300, 5")
        self.assertEqual(r.words("lock"), ["@@lock 5 forced"])
        self.assertEqual(ns(r)[-1]["lock"], 5)
        self.assertEqual(ns(r)[-1]["name"], "locked")
        # put down flat: ready, with the forced number
        s = Script().at(0, acc=FLAT)
        r = run(s, 1.5, "0, -1, 90, 300, 5")
        self.assertEqual((ns(r)[-1]["name"], ns(r)[-1]["lock"]), ("ready", 5))

    def test_every_other_led_is_switched_off_at_start_and_at_the_end(self):
        robot = VirtualRobot()
        for bank in (robot.lego_f, robot.lego_b, robot.buttons_led):
            bank.v = [9] * len(bank.v)             # lit by the firmware's behaviours before the mode took over
        robot.circle.v = [9] * 8
        robot.on_tick = Script().at(0, acc=FLAT).driver()
        robot.max_ticks = 5
        load(SOURCE, robot, "\nrun()\n")
        for bank in (robot.lego_f, robot.lego_b, robot.buttons_led, robot.circle):
            self.assertEqual(bank.v, [0] * len(bank.v))

    def test_a_firmware_without_the_other_leds(self):
        r = run(Script().at(0, acc=acc_for_number(2)).at(1.5, ground=HAND), 3.0, extra_leds=False)
        self.assertEqual(r.words("lock"), ["@@lock 2"])

    def test_no_ground_sensors(self):
        s = Script().at(0, acc=acc_for_number(1)).at(1.5, ground=HAND)
        r = run(s, 3.0, ground=False)
        self.assertEqual(r.words("lock"), [])
        self.assertEqual(ns(r)[-1]["num"], 1)
        r = run(Script().at(0, acc=FLAT), 1.0, "0, -1, 90, 300, 3", ground=False)
        self.assertEqual(ns(r)[-1]["lock"], 3)


class Placing(unittest.TestCase):
    def locked_then(self, *moves):
        s = Script().at(0, acc=acc_for_number(3)).at(1.5, ground=HAND).at(2.0, ground=NOHAND)
        for t, acc in moves:
            s.at(t, acc=acc)
        return s

    def test_flat_for_half_a_second_is_ready(self):
        s = self.locked_then((3.0, FLAT))
        r = run(s, 4.0)
        names = [p for _, p in phases(r)]
        self.assertEqual(names, ["locked", "ready"])
        self.assertEqual(r.words("placed"), ["@@placed"])
        t_ready = [ms for ms, p in phases(r) if p == "ready"][0]
        self.assertTrue(3500 <= t_ready <= 3700, t_ready)
        self.assertEqual(ns(r)[-1]["lock"], 3)

    def test_a_short_touch_down_is_not_enough(self):
        s = self.locked_then((3.0, FLAT), (3.3, acc_for_number(3)))
        self.assertNotIn("ready", [p for _, p in phases(run(s, 5.0))])

    def test_lifted_goes_back_to_locked(self):
        s = self.locked_then((3.0, FLAT), (5.0, [9000, 0, 9000]))
        r = run(s, 6.0)
        self.assertEqual([p for _, p in phases(r)], ["locked", "ready", "locked"])
        self.assertEqual(r.words("lifted"), ["@@lifted"])
        self.assertEqual(ns(r)[-1]["lock"], 3)

    def test_a_small_wobble_does_not_lift_it(self):
        s = self.locked_then((3.0, FLAT), (5.0, [0, 0, 8000]), (5.1, FLAT))
        self.assertEqual([p for _, p in phases(run(s, 6.0))], ["locked", "ready"])

    def test_the_button_does_nothing_before_it_is_ready(self):
        # not locked
        s = Script().at(0, acc=FLAT).press(1.0)
        r = run(s, 2.0)
        self.assertEqual(r.words("ignored"), ["@@ignored nolock"])
        self.assertEqual(phases(r), [])
        self.assertEqual([c for c in r.speed_log if c[1] or c[2]], [])          # (the zeros are the cleanup of the cut script)
        # locked but held up
        s = self.locked_then().press(3.0)
        r = run(s, 4.0)
        self.assertEqual(r.words("ignored"), ["@@ignored notflat"])
        self.assertEqual([p for _, p in phases(r)], ["locked"])

    def test_the_button_pressed_while_putting_it_down_is_ignored_then_works(self):
        s = self.locked_then((3.0, FLAT)).press(3.2).press(5.0)
        r = run(s, 6.0)
        self.assertEqual(r.words("ignored"), ["@@ignored notflat"])
        self.assertIn("spin", [p for _, p in phases(r)])

    def test_a_held_button_starts_once(self):
        s = self.locked_then((3.0, FLAT))
        s.at(5.0, centre=True)
        s.at(9.0, centre=False)
        r = run(s, 10.0)
        self.assertEqual(len(r.words("go")), 1)


ONBACK = [0, 0, -G]


class Reset(unittest.TestCase):
    """The magician's hands are busy and the page is only to be looked at: a robot turned on its back forgets the number."""

    def locked_script(self):
        return Script().at(0, acc=acc_for_number(3)).at(1.5, ground=HAND).at(2.0, ground=NOHAND)

    def test_on_its_back_for_half_a_second_while_locked(self):
        s = self.locked_script().at(3.0, acc=[2000, 1500, 8000]).at(3.3, acc=ONBACK)
        r = run(s, 5.0)
        self.assertEqual(r.words("reset"), ["@@reset"])
        d = ns(r)[-1]
        self.assertEqual((d["name"], d["lock"]), ("wait", -1))
        self.assertIn((440), [f for _, f, _ in r.tones])
        # the lights are off again
        self.assertEqual(r.circle.v, [0] * 8)
        self.assertEqual(r.rgb, [(0, 0, 0)] * 4)

    def test_on_its_back_while_ready(self):
        s = self.locked_script().at(3.0, acc=FLAT).at(5.0, acc=ONBACK)
        r = run(s, 6.5)
        # (it is lifted first, after 0.2 s without being flat, and forgotten when it has been on its back for 0.5 s)
        self.assertEqual([p for _, p in phases(r)], ["locked", "ready", "locked", "wait"])
        self.assertEqual(r.words("reset"), ["@@reset"])

    def test_a_flip_shorter_than_half_a_second_does_nothing(self):
        s = self.locked_script().at(3.0, acc=FLAT).at(4.0, acc=ONBACK).at(4.3, acc=FLAT)
        r = run(s, 6.0)
        self.assertEqual(r.words("reset"), [])
        self.assertEqual(ns(r)[-1]["name"], "ready")

    def test_nothing_to_forget_when_waiting(self):
        s = Script().at(0, acc=FLAT).at(1.0, acc=ONBACK)
        r = run(s, 3.0)
        self.assertEqual(r.words("reset"), [])
        self.assertEqual(r.tones, [])

    def test_the_trick_can_be_done_again_after_a_reset(self):
        s = self.locked_script().at(3.0, acc=ONBACK).at(5.0, acc=acc_for_number(6)).at(7.0, ground=HAND)
        r = run(s, 9.0)
        self.assertEqual(r.words("lock"), ["@@lock 3", "@@lock 6"])
        self.assertEqual(ns(r)[-1]["lock"], 6)

    def test_no_sound_when_sounds_are_off(self):
        s = self.locked_script().at(3.0, acc=ONBACK)
        r = run(s, 5.0, "0, -1, 90, 300, -1, 0")
        self.assertEqual(r.words("reset"), ["@@reset"])
        self.assertEqual(r.tones, [])


class Show(unittest.TestCase):
    def check_show(self, n, args="", dist=90, **kw):
        s, press = full_show(n, args=args, **kw)
        r = run(s, press + 25.0, args)
        names = [p for _, p in phases(r)]
        self.assertEqual(names, ["locked", "ready", "spin", "drive", "finale", "wait"], "number %d: %r" % (n, names))
        self.assertEqual(r.words("go"), ["@@go %d" % n])
        self.assertEqual(r.words("end"), ["@@end %d" % n])
        return r, press, dist

    def test_the_show_for_every_number(self):
        for n in range(8):
            r, press, dist = self.check_show(n)
            when = {p: ms for ms, p in phases(r)}
            # the order and the timing: the show starts at the press (within a tick); the turn (a full turn and on to the number) takes 4 to 8 s
            self.assertTrue(abs(when["spin"] - press * 1000) <= 60, (n, when["spin"]))
            self.assertTrue(3500 <= when["drive"] - when["spin"] <= 9000, (n, when["drive"] - when["spin"]))
            # where it ends: `dist` mm from the start, in the direction of the number, clockwise from the start heading
            final = [p for p in r.poses if when["finale"] <= p[0] <= when["finale"] + 20][0]
            x, y, theta = final[1], final[2], final[3]
            want = -45.0 * n
            wrapped = (theta - want + 180) % 360 - 180
            self.assertLess(abs(wrapped), 4.0, "number %d heading %.1f" % (n, theta))
            self.assertLess(abs(math.hypot(x, y) - dist), 12.0, "number %d distance %.1f" % (n, math.hypot(x, y)))
            bearing = math.degrees(math.atan2(-x, y))              # clockwise from +y is negative of the counter-clockwise angle
            self.assertLess(abs(((bearing - want) + 180) % 360 - 180), 5.0, "number %d bearing %.1f" % (n, bearing))

    def test_one_turn_clockwise_that_goes_on_to_the_number(self):
        # not the shortest way: the full turn goes on in the same direction up to the number, 360 + n x 45 degrees in one rotation
        for n in range(8):
            r, press, _ = self.check_show(n)
            calls = [c for c in r.rot_calls if c[1] == "abs"]
            self.assertEqual([c[2] for c in calls], [-(360 + 45 * n)], "number %d" % n)
            spin = [ms for ms, p in phases(r) if p == "spin"][0]
            drive = [ms for ms, p in phases(r) if p == "drive"][0]
            heading = [p[3] for p in r.poses if spin <= p[0] <= drive]
            # it never turns back (the controller may overshoot by a degree or two), and it turns the whole way
            lowest = 0.0
            for h in heading:
                self.assertLess(h, lowest + 3.0, "number %d turned back at %.1f" % (n, h))
                lowest = min(lowest, h)
            self.assertLess(min(heading), -(360 + 45 * n) + 4.0, "number %d did not get there" % n)
            self.assertGreater(min(heading), -(360 + 45 * n) - 6.0, "number %d went past" % n)

    def test_the_turn_does_not_stop_on_the_way(self):
        # number 6 is 630 degrees: the first full turn is over far from the end of the rotation, and the robot goes on at full speed
        r, press, _ = self.check_show(6)
        spin = [ms for ms, p in phases(r) if p == "spin"][0]
        drive = [ms for ms, p in phases(r) if p == "drive"][0]
        turn = [p for p in r.poses if spin <= p[0] <= drive]
        crossing = [i for i, p in enumerate(turn) if p[3] <= -360][0]
        for i in range(crossing - 5, crossing + 6):
            self.assertGreater(abs(turn[i][3] - turn[i - 1][3]), 2.5, "slow at %d ms (%.1f deg)" % (turn[i][0], turn[i][3]))

    def test_the_full_turn_is_clockwise_on_the_spot(self):
        r, press, _ = self.check_show(0)
        spin = [ms for ms, p in phases(r) if p == "spin"][0]
        drive = [ms for ms, p in phases(r) if p == "drive"][0]
        turn = [p for p in r.poses if spin <= p[0] <= drive]
        heading = [p[3] for p in turn]
        self.assertLess(min(heading), -340)                      # a full turn to the right (heading goes negative)
        self.assertLess(max(math.hypot(p[1], p[2]) for p in turn), 12)         # on the spot (wheel base 94: no more than a few mm)

    def test_distance_setting(self):
        for dist in (50, 90, 150):
            r, press, _ = self.check_show(2, args="0, -1, %d" % dist, dist=dist)
            when = {p: ms for ms, p in phases(r)}
            final = [p for p in r.poses if when["finale"] <= p[0] <= when["finale"] + 20][0]
            self.assertLess(abs(math.hypot(final[1], final[2]) - dist), 12.0, (dist, math.hypot(final[1], final[2])))

    def test_the_finale(self):
        r, press, _ = self.check_show(2)
        when = {p: ms for ms, p in phases(r)}
        tones = [(ms, f) for ms, f, _ in r.tones if ms >= when["finale"]]
        self.assertEqual([f for _, f in tones], [523, 659, 784, 1047, 784, 880, 988, 1175, 1047, 1175, 1319])
        self.assertGreaterEqual(tones[0][0], when["finale"])
        self.assertTrue(3200 <= when["wait"] - when["finale"] <= 4600, when["wait"] - when["finale"])
        # the circle blinks in the finale, and everything is dark at the end
        log = [(ms, sum(1 for v in c if v)) for ms, c in r.circle_log if ms >= when["finale"]]
        self.assertGreaterEqual(len(log), 12)
        self.assertEqual(log[-1][1], 0)
        self.assertEqual(r.rgb, [(0, 0, 0)] * 4)
        self.assertEqual(r.vl, 0)
        self.assertEqual(r.vr, 0)

    def test_back_in_wait_for_the_next_volunteer(self):
        s, press = full_show(5)
        # after the show: the robot is picked up and shown with another number, a new hand
        end = press + 15.0
        s.at(end, acc=acc_for_number(1)).at(end + 2.0, ground=HAND)
        r = run(s, end + 4.0)
        self.assertEqual(r.words("lock"), ["@@lock 5", "@@lock 1"])
        self.assertEqual(ns(r)[-1]["lock"], 1)

    def test_no_sound(self):
        s, press = full_show(2)
        r = run(s, press + 25.0, "0, -1, 90, 300, -1, 0")
        self.assertEqual(r.tones, [])
        self.assertEqual(r.sounds, [])
        self.assertEqual(r.words("end"), ["@@end 2"])

    def test_a_firmware_without_play_tone_falls_back_on_a_sound(self):
        s, press = full_show(2)
        r = run(s, press + 25.0, no_tone=True) if False else None
        robot = VirtualRobot()
        robot.no_tone = True
        robot.on_tick = s.driver()
        robot.max_ticks = int((press + 25.0) * 1000 / TICK_MS)
        load(SOURCE, robot, "\nrun()\n")
        self.assertEqual(robot.tones, [])
        self.assertEqual([i for _, i in robot.sounds], [11])
        self.assertEqual(robot.words("end"), ["@@end 2"])

    def test_picked_up_in_the_middle_stops_the_robot(self):
        for when in (0.5, 2.5, 5.0):                    # early in the turn, in the middle of it, during the drive
            s, press = full_show(2)
            s.at(press + when, acc=[6000, 0, 6000])            # lifted and tilted
            r = run(s, press + 12.0)
            self.assertEqual(r.words("abort"), ["@@abort lifted"], when)
            names = [p for _, p in phases(r)]
            self.assertEqual(names[-1], "locked", names)
            self.assertNotIn("finale", names)
            self.assertEqual((r.vl, r.vr), (0, 0))
            self.assertFalse(r.timer_on)
            self.assertEqual(ns(r)[-1]["lock"], 2)
            # put down again: ready again, and it can be started again
            s.at(press + when + 2.0, acc=FLAT).press(press + when + 5.0)
            r = run(s, press + when + 30.0)
            self.assertIn("finale", [p for _, p in phases(r)])

    def test_a_motor_mismatch_does_not_spoil_the_turn(self):
        # the heading of the drive is held by the gyroscope: the final bearing is right even with a weak wheel
        s, press = full_show(2)
        robot = VirtualRobot()
        orig = robot.step

        def step(dt_us=2000):
            vl = robot.vl
            robot.vl = int(vl * 0.96)
            orig(dt_us)
            robot.vl = vl
        robot.step = step
        robot.on_tick = s.driver()
        robot.max_ticks = int((press + 25.0) * 1000 / TICK_MS)
        load(SOURCE, robot, "\nrun()\n")
        when = {p: ms for ms, p in phases(robot)}
        final = [p for p in robot.poses if when["finale"] <= p[0] <= when["finale"] + 20][0]
        self.assertLess(abs(((final[3] - (-90.0)) + 180) % 360 - 180), 6.0)


class Lines(unittest.TestCase):
    def test_start_up_lines(self):
        r = run(Script().at(0, acc=FLAT), 0.5)
        self.assertEqual(r.words("hello"), ["@@hello 1"])
        self.assertEqual(r.words("cfg"), ["@@cfg 0 -1 90 300 -1 1"])
        self.assertEqual(r.words("bat"), ["@@bat 4012"])

    def test_every_100_ms(self):
        r = run(Script().at(0, acc=FLAT), 2.0)
        times = [ms for ms, t in r.lines if t.startswith("@@n ")]
        self.assertEqual(len(times), 20)
        self.assertTrue(all(abs((b - a) - 100) <= 2 for a, b in zip(times, times[1:])))

    def test_the_line_has_everything_the_page_needs(self):
        s = Script().at(0, acc=acc_for_number(6), ground=[12, 34])
        d = ns(run(s, 1.5))[-1]
        self.assertEqual((d["state"], d["lock"], d["num"]), (0, -1, 6))
        self.assertEqual(d["flags"], 1 | 8)
        self.assertEqual((d["gl"], d["gr"]), (12, 34))
        self.assertTrue(abs(d["ay"] + G) < 50 and abs(d["ax"]) < 50)

    def test_the_button_flag(self):
        s = Script().at(0, acc=FLAT).at(0.5, centre=True).at(1.0, centre=False)
        flags = [d["flags"] & 16 for d in ns(run(s, 1.5))]
        self.assertIn(16, flags)
        self.assertEqual(flags[-1], 0)

    def test_lines_are_padded_to_one_hundred_bytes(self):
        robot = VirtualRobot()
        raw = []

        def on_tick(r):
            pass
        robot.on_tick = on_tick
        robot.max_ticks = 10
        import fake_magic_robot as f
        thymio_mod, time_mod = f.make_modules(robot)
        saved = {k: sys.modules.get(k) for k in ("thymio", "time")}
        sys.modules["thymio"], sys.modules["time"] = thymio_mod, time_mod
        try:
            ns_ = {"print": lambda *a, **k: raw.append("".join(str(x) for x in a)), "__name__": "m"}
            try:
                exec(compile(SOURCE + "\nrun()\n", "m", "exec"), ns_)
            except StopSim:
                pass
        finally:
            for k, v in saved.items():
                if v is None:
                    sys.modules.pop(k, None)
                else:
                    sys.modules[k] = v
        self.assertTrue(raw)
        self.assertTrue(all(len(x) == 100 and x.endswith("\x1e") for x in raw), [len(x) for x in raw][:5])

    def test_stopping_gives_the_robot_back(self):
        # a stop by the page ends the script with an exception: the cleanup runs
        robot = VirtualRobot()
        robot.on_tick = Script().at(0, acc=FLAT).driver()
        robot.max_ticks = 30
        load(SOURCE, robot, "\nrun()\n")
        self.assertTrue(robot.behaviors_enabled)               # the script was cut where it stood (StopSim passes through finally): the robot is given back
        self.assertEqual(robot.words("bye"), ["@@bye"])
        self.assertEqual((robot.vl, robot.vr), (0, 0))
        self.assertEqual(robot.rgb, [(0, 0, 0)] * 4)


# ---- the golden file for the JavaScript twin ---------------------------------------------------------------------------------
def golden_scenarios():
    out = []

    def add(name, script, seconds, args="", **robot_kw):
        out.append((name, script, seconds, args, robot_kw))

    for n in range(8):
        s, press = full_show(n)
        add("show-%d" % n, s, press + 18.0)
    s, press = full_show(3, acc=acc_for_number(3, theta4=37, dirn=1), args="37, 1, 120, 250", ground=[260, 100])
    add("calibrated", s, press + 18.0, "37, 1, 120, 250")
    s = Script().at(0, acc=FLAT)
    for i in range(80):
        theta = -22.5 + (14 if i % 2 else -14) * 0.5
        s.at(0.5 + i * 0.05, acc=[int(G * math.cos(math.radians(theta))), int(G * math.sin(math.radians(theta))), 0])
    s.at(5.0, ground=HAND).at(5.4, ground=NOHAND).at(7.0, ground=HAND)
    add("wobble", s, 11.0)
    s, press = full_show(2)
    s.at(press + 5.0, acc=[6000, 0, 6000])
    s.at(press + 7.0, acc=FLAT).press(press + 10.0)
    add("lifted-in-show", s, press + 40.0)
    s = Script().at(0, acc=FLAT).at(1.0, acc=[3000, 2000, 9000]).at(1.4, acc=FLAT).press(3.0)
    add("forced", s, 28.0, "0, -1, 90, 300, 5")
    s = Script().at(0, acc=acc_for_number(3)).at(1.5, ground=HAND).at(2.0, ground=NOHAND).at(3.0, acc=FLAT).at(5.0, acc=[0, 0, -G])
    s.at(7.0, acc=acc_for_number(6)).at(9.0, ground=HAND).at(9.4, ground=NOHAND).at(10.5, acc=FLAT)
    add("reset-on-back", s, 14.0)
    s, press = full_show(6)
    add("no-sound", s, press + 18.0, "0, -1, 60, 300, -1, 0")
    s = Script().at(0, acc=acc_for_number(1)).at(1.5, ground=HAND).press(2.0).press(3.0)
    s.at(3.5, acc=FLAT).press(4.0)
    s.at(6.0, acc=FLAT).press(6.5)
    add("early-presses", s, 30.0)
    return out


def write_golden(path):
    data = []
    for name, script, seconds, args, robot_kw in golden_scenarios():
        r = run(script, seconds, args, **robot_kw)
        data.append({
            "name": name, "args": args, "ticks": int(seconds * 1000 / TICK_MS), "events": sorted(script.events, key=lambda e: e[0]),
            "lines": [[ms, t] for ms, t in r.lines],
            "tones": [[ms, f, d] for ms, f, d in r.tones],
            "sounds": [[ms, i] for ms, i in r.sounds],
            "final": [round(r.x, 2), round(r.y, 2), round(r.heading_deg(), 2)],
        })
    with open(path, "w") as f:
        json.dump(data, f)
    print("golden: %d scenarios, %d lines" % (len(data), sum(len(d["lines"]) for d in data)))


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--golden":
        write_golden(sys.argv[2])
    else:
        unittest.main(verbosity=1)
