/**
 * InputManager — captures and normalises all keyboard + mouse input.
 *
 * Usage:
 *   const input = new InputManager(domElement);
 *   // in game loop:
 *   const state = input.getState();
 *   // cleanup:
 *   input.dispose();
 */
export class InputManager {
  constructor(domElement) {
    this.dom = domElement;

    // ── Keyboard state ──────────────────────────────────────────────
    this._keys = new Set();

    // ── Mouse delta (accumulated per frame then zeroed) ─────────────
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;

    // ── Pointer lock ────────────────────────────────────────────────
    this.isPointerLocked = false;

    // ── Bound handlers (needed for removeEventListener) ─────────────
    this._onKeyDown   = this._onKeyDown.bind(this);
    this._onKeyUp     = this._onKeyUp.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp   = this._onMouseUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPLChange  = this._onPLChange.bind(this);
    this._onClick     = this._onClick.bind(this);

    window.addEventListener('keydown',    this._onKeyDown,  { passive: true });
    window.addEventListener('keyup',      this._onKeyUp,    { passive: true });
    this.dom.addEventListener('mousedown', this._onMouseDown, { passive: true });
    this.dom.addEventListener('mouseup',   this._onMouseUp,   { passive: true });
    document.addEventListener('pointerlockchange', this._onPLChange);
    document.addEventListener('mousemove', this._onMouseMove, { passive: true });
    this.dom.addEventListener('click', this._onClick);
  }

  // ── Private handlers ──────────────────────────────────────────────

  _onKeyDown(e) { this._keys.add(e.code); }
  _onKeyUp(e)   { this._keys.delete(e.code); }

  _onMouseDown(e) {
    if (e.button === 0) this._keys.add('Mouse0');
    if (e.button === 2) this._keys.add('Mouse2');
  }

  _onMouseUp(e) {
    if (e.button === 0) this._keys.delete('Mouse0');
    if (e.button === 2) this._keys.delete('Mouse2');
  }

  _onMouseMove(e) {
    if (!this.isPointerLocked) return;
    this.mouseDeltaX += e.movementX;
    this.mouseDeltaY += e.movementY;
  }

  _onPLChange() {
    this.isPointerLocked = document.pointerLockElement === this.dom;
    if (!this.isPointerLocked) {
      this.mouseDeltaX = 0;
      this.mouseDeltaY = 0;
    }
  }

  _onClick() {
    if (!this.isPointerLocked) {
      this.dom.requestPointerLock();
    }
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Returns the normalised input state for the current frame.
   * Resets mouse deltas after read (consume-once pattern).
   */
  getState() {
    const k = this._keys;
    const state = {
      // Movement
      forward:  k.has('KeyW') || k.has('ArrowUp'),
      backward: k.has('KeyS') || k.has('ArrowDown'),
      left:     k.has('KeyA') || k.has('ArrowLeft'),
      right:    k.has('KeyD') || k.has('ArrowRight'),
      sprint:   k.has('ShiftLeft') || k.has('ShiftRight'),
      jump:     k.has('Space'),

      // Actions
      attack:      k.has('Mouse0') || k.has('KeyE'),
      interact:    k.has('KeyF'),
      toggleCamera: k.has('KeyV'),

      // Mouse look (world-space delta)
      mouseDX: this.mouseDeltaX,
      mouseDY: this.mouseDeltaY,

      // Pointer lock
      isPointerLocked: this.isPointerLocked,
    };

    // Consume mouse delta
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;

    return state;
  }

  /** Release all event listeners. */
  dispose() {
    window.removeEventListener('keydown',  this._onKeyDown);
    window.removeEventListener('keyup',    this._onKeyUp);
    this.dom.removeEventListener('mousedown', this._onMouseDown);
    this.dom.removeEventListener('mouseup',   this._onMouseUp);
    document.removeEventListener('pointerlockchange', this._onPLChange);
    document.removeEventListener('mousemove', this._onMouseMove);
    this.dom.removeEventListener('click', this._onClick);

    if (document.pointerLockElement === this.dom) {
      document.exitPointerLock();
    }
  }
}
