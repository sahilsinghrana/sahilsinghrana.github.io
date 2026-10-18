import assert from "node:assert/strict";
import test from "node:test";
import { createSpinControl } from "../src/components/General/Moon/3dMoon/spin-control.js";

class Button extends EventTarget {
  dataset = {};
  attributes = new Map();
  setAttribute(key, value) {
    this.attributes.set(key, value);
  }
  click() {
    this.dispatchEvent(new Event("click"));
  }
}
class Preference extends EventTarget {
  matches = false;
  change(value) {
    this.matches = value;
    this.dispatchEvent(new Event("change"));
  }
}

test("spin control appears only when ready and toggles its action label", () => {
  const button = new Button(),
    preference = new Preference();
  const control = createSpinControl(button, preference);
  assert.equal(button.hidden, true);
  assert.equal(control.paused, false);
  control.reveal();
  assert.equal(button.hidden, false);
  for (let i = 0; i < 6; i++) {
    button.click();
    assert.equal(control.paused, i % 2 === 0);
    assert.equal(button.dataset.paused, String(control.paused));
    assert.equal(
      button.attributes.get("aria-label"),
      control.paused ? "Resume Moon auto-spin" : "Pause Moon auto-spin",
    );
  }
  control.dispose();
});

test("reduced motion prevents spin and retains the user's pause choice", () => {
  const button = new Button(),
    preference = new Preference();
  const control = createSpinControl(button, preference);
  preference.change(true);
  assert.equal(control.paused, true);
  assert.equal(button.disabled, true);
  assert.match(button.title, /reduced motion/);
  button.click();
  preference.change(false);
  assert.equal(control.paused, false);
  assert.equal(button.disabled, false);
  button.click();
  preference.change(true);
  preference.change(false);
  assert.equal(control.paused, true);
  control.dispose();
});

test("failed initialization stays hidden; disposal unbinds controls and a new scene resets", () => {
  const button = new Button(),
    preference = new Preference();
  const control = createSpinControl(button, preference);
  button.click();
  control.dispose();
  control.dispose();
  const label = button.title;
  button.click();
  preference.change(true);
  control.reveal();
  assert.equal(button.hidden, true);
  assert.equal(button.title, label);
  preference.change(false);
  const next = createSpinControl(button, preference);
  assert.equal(next.paused, false);
  next.reveal();
  button.click();
  assert.equal(next.paused, true, "Exactly one live handler handles the click");
  next.dispose();
});
