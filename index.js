// public scope
var game = {};
game.restart = () => {};

// game
(function() {
  // globals
  const DAY_NIGHT_DURATION_IN_SECONDS = 5;

  // hard : 4
  // medium: 6.7
  // easy: 8

  // colors
  const sun = { r: 249, g: 215, b: 28 };
  const moon = { r: 244, g: 241, b: 201 };

  const sunrise1 = {r: 32, g: 70, b: 106}; // this is the sky
  const sunrise2 = {r: 120, g: 166, b: 232 };
  const sunrise3 = {r: 194, g: 195, b: 199};
  const sunrise4 = {r: 221, g:178, b: 133};
  const sunrise5 = {r: 255, g: 92, b: 61}; // this is the ground

  const sunset1 = {r:12, g:18, b:44}; // this is the sky
  const sunset2 = {r: 42, g: 10, b: 86};
  const sunset3 = {r: 83, g: 50,b: 86};
  const sunset4 = {r:157, g:50, b:4};
  const sunset5 = {r:0, g:0, b:0}; // this is the ground

  // star coordinates relative to a workspace with dimension { w: 700 h: 700 }
  const starSpawnCoordinates = [ 
    229, 268,
    451, 147, 
    268, 378, 
    53, 360, 
    117, 548, 
    225, 459, 
    358, 615, 
    561, 249, 
    601, 112, 
    497, 401, 
    381, 201, 
    400, 338, 
  ]
  const starLocalCoordinates = [
              -2, 0, 
    -0.436781609, 0.275862069, // g 
            -0.7, 0.7,
    -0.275862069, 0.436781609, // f 
               0, 2,
     0.275862069, 0.436781609, // k 
             0.7, 0.7,
     0.436781609, 0.275862069, // l
               2, 0,
     0.436781609, -0.275862069, // j
             0.7, -0.7,
     0.275862069, -0.436781609, // i 
               0, -2,
    -0.275862069, -0.436781609, // n
            -0.7, -0.7,
    -0.436781609, -0.275862069 // h
  ];
  
  // dom
  /** @type {HTMLCanvasElement} */ var domCanvas;
  /** @type {CanvasRenderingContext2D} */ var ctx;
  /** @type {HTMLElement} */ var domRemainingStars;

  // game variables
  var isPaused = false;
  var canRestart = false;
  var isRestartting = false;
  /** @type {Star[]} */ var allActiveStars = [];
  var starHitboxSize = 0;
  var remainingStarCount = 0;

  // actual constants
  const TAU = 6.283185307179586;
  const MILLISECONDS_PER_SECOND = 1000;
  const UNIT_SIZE_IN_PIXELS = 25;
  const NIGHT_DAY_RATIO = 0.75; // % of the time stars will be clickable, around night
  const DEFAULT_LINE_WIDTH = 5;
  const CALLS_PER_SECOND = 33;
  const DELAY_PER_CALL = MILLISECONDS_PER_SECOND / CALLS_PER_SECOND;

  // classes
  class Star {
    #status = "none"; #isBlinking; #isSpinning; 
    /** @type {Vector2} */ #position;
    /** @type {number} rotation in radians */ rotation = 0;
    /** @type {boolean} */ isMouseOver = false;
    
    /** @param {Vector2} position */
    constructor(position) {
      this.#position = position;
    }

    get isBlinking() { return this.#isBlinking }
    get isSpinning() { return this.#isSpinning }
    get status() { return this.#status; }
    get position() { return this.#position; }
    startBlinking() {
      this.#isBlinking = true;
      this.#isSpinning = false;
      this.#status = "blinking";
    }
    startSpinning() {
      this.#isSpinning = true;
      this.#isBlinking = false;
      this.#status = "spinning";
    }
  }
  
  class Vector2 {
    /** @type {number} */ x;
    /** @type {number} */ y;

    /** @param {number} x x coordinate @param {number} y y coordinate  */
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
    
    /** @type {Vector2} */ static zero = new Vector2(0, 0);
    /** @type {Vector2} */ static up = new Vector2(0, 1)
    /** @type {Vector2} */ static down = new Vector2(0, -1)
    /** @type {Vector2} */ static right = new Vector2(1, 0)
    /** @type {Vector2} */ static left = new Vector2(-1, 0)
    /** @param {Vector2} point @param {number} angle */
    static rotatePoint(point, angle, pivot = Vector2.zero) {
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      point.x -= pivot.x;
      point.y -= pivot.y;
      var xnew = point.x * cos - point.y * sin;
      var ynew = point.x * sin + point.y * cos;
      xnew += pivot.x;
      ynew += pivot.y;
      return new Vector2(xnew, ynew);
    }
    
    /** @param {Vector2} pointA @param {Vector2} pointB */
    static distance(pointA, pointB) {
      return Math.sqrt((pointA.x-pointB.x)**2 + (pointA.y-pointB.y)**2 );
    }
  }
  
  window.onload = function() {            
    initGame();
    setInterval(updateCanvas, DELAY_PER_CALL); // this creates "intervals" and executes them repeatedly every amount of ms
  }

  function initGame() {
    // game variables
    normalizedCos = 1;
    isDay = true;
    exposeGameVariableToHTML();

    // star instances
    for (let i = 0; i < starSpawnCoordinates.length - 1; i += 2) {
      const position = new Vector2( starSpawnCoordinates[i], starSpawnCoordinates[i+1] );
      const star = new Star(position);

      allActiveStars.push(star);
    }

    // elements
    domCanvas = document.getElementById("main-canvas");
    ctx = domCanvas.getContext('2d');
    domRemainingStars = document.getElementById("star-count");

    // canvas
    makeCanvasWholeScreen();

    // listeners
    document.addEventListener("keypress", (keyboardEvt) => onKeyboardPressed(keyboardEvt));
    domCanvas.addEventListener("click", (mouseEvt) => onMouseClick(mouseEvt));
    domCanvas.addEventListener("mousemove", (mouseEvt) => onMouseMove(mouseEvt));

    // init game
    onMorning();
  }
  function makeCanvasWholeScreen() {
    domCanvas.width = document.body.clientWidth;
    domCanvas.height = document.body.clientHeight;
  }

  var gradient;
  var isDay = true;
  var isNight = false;
  function updateCanvas() {
    if (isPaused) {
      return;
    } else if (isRestartting) {
      angle = 0;
      normalizedCos = 0;
      inverseCos = 1;
      isRestartting = false;
    }

    var skyA = lerpColor(sunset1, sunrise1, normalizedCos); // higher sky
    var skyB = lerpColor(sunset2, sunrise2,  normalizedCos);
    var skyC = lerpColor(sunset3, sunrise3,  normalizedCos);
    var skyD = lerpColor(sunset4, sunrise4,  normalizedCos);
    var skyE = lerpColor(sunset5, sunrise5,  normalizedCos); // lower ground

    gradient = ctx.createLinearGradient(0, 0, domCanvas.width, domCanvas.height);
    gradient.addColorStop(0, `rgba(${skyA.r}, ${skyA.g}, ${skyA.b}, 1)`);
    gradient.addColorStop(0.5, `rgba(${skyB.r}, ${skyB.g}, ${skyB.b}, 1)`);
    gradient.addColorStop(0.8, `rgba(${skyC.r}, ${skyC.g}, ${skyC.b}, 1)`);
    gradient.addColorStop(0.9, `rgba(${skyD.r}, ${skyD.g}, ${skyD.b}, 1)`);
    gradient.addColorStop(1, `rgba(${skyE.r}, ${skyE.g}, ${skyE.b}, 1)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, domCanvas.width, domCanvas.height);

    // sun and moon
    var sunAndMoonColor = lerpColor(moon, sun, normalizedCos);

    gradient = ctx.createRadialGradient(0, 0, 240, 0, 0, 250);
    gradient.addColorStop(0, `rgba(${sunAndMoonColor.r}, ${sunAndMoonColor.g}, ${sunAndMoonColor.b}, 1)`);  
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, domCanvas.width, domCanvas.height);

    // draw all stars
    for (const starIndex in allActiveStars) {
      const star = allActiveStars[starIndex];
      drawStar(star, inverseCos);
      starHitboxSize = UNIT_SIZE_IN_PIXELS * inverseCos;
    }
   
    const canTurnToNight = normalizedCos < NIGHT_DAY_RATIO && isDay;
    const canTurnToDay = normalizedCos > NIGHT_DAY_RATIO && isNight;
    if (canTurnToNight) {
      isDay = false;
      isNight = true;

      onDawn();
    } else if (canTurnToDay) {
      isDay = true;
      isNight = false;

      onMorning();
    }
    
    animateCosineWave(DAY_NIGHT_DURATION_IN_SECONDS);
  }

  // cosine wave interpolation 
  var angle = 0;
  var normalizedCos = 0;
  var inverseCos = 1;
  function animateCosineWave(halfAPeriodDuration = 5) {
    const periodDuration = halfAPeriodDuration * 2;
    if (angle >= TAU) {
      angle = 0;
    }
    if (angle == 0) { timeStart = Date.now(); }
    
    const cos = Math.cos(angle)

    // this is 1 in day, 0 in the night
    normalizedCos = normalizeCosine(cos);

    // this is 1 in night, 0 in the day
    inverseCos = 1 - normalizedCos;
    
    const angleIncrementPerIteration = 1 / (CALLS_PER_SECOND * periodDuration) * TAU;
    angle += angleIncrementPerIteration;
  }
  // that way the cosine wave (1 -> -1 -> 1) is normalized to unitary values  (1 -> 0 -> 1)
  function normalizeCosine(cos) {
    return (1 + cos) * 0.5;
  }

  function lerpColor(colorA, colorB, t) {
    const result = {
      r: lerpValue(colorA.r, colorB.r, t),
      g: lerpValue(colorA.g, colorB.g, t),
      b: lerpValue(colorA.b, colorB.b, t)
    };
    return result
  }

  function lerpValue(a, b, t) {
    const result = a * (1 - t) + b * t;
    return result;
  }
  
  // draw methods
  /** @param {Star} star @param {number} scale */
  function drawStar(star, scale) {
    const LOWEST_RANDOM_INCLUSIVE = 4;
    const INCLUSIVE_RANGE = 1;
    
    const pos = star.position;
    if (star.isBlinking) {
      const rand = Math.round(Math.random() * INCLUSIVE_RANGE) + LOWEST_RANDOM_INCLUSIVE;
      ctx.strokeStyle = "white";
      ctx.fillStyle = "white";
      ctx.lineWidth = rand * scale; // means 4 to 6
      
      drawShape(pos, starLocalCoordinates, scale, scale);
    } else {
      ctx.lineWidth = DEFAULT_LINE_WIDTH;
      star.rotation += TAU * 0.1;

      const color = `rgba(220, 220, 130, 1)`;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      const scaleMult = 1.2;
      drawShape(pos, starLocalCoordinates, scale * scaleMult, scale * scaleMult, star.rotation);
    }

  }
  /** @param {Vector2} shapePiv */
  function drawShape(shapePiv, coords, xScale, yScale, rotation = 0) {
    const x = shapePiv.x;
    const y = shapePiv.y;

    const hasRotation = rotation === 0 == false;

    var nextCoord = new Vector2(x + (coords[0] * xScale), y + (coords[1] * yScale));

    const firstCoord = hasRotation ?  Vector2.rotatePoint(nextCoord, rotation, shapePiv) : nextCoord;
    const scaleMultiplier = (xScale + yScale) / 2;
    ctx.lineWidth *= scaleMultiplier;
    ctx.beginPath();
    ctx.moveTo(firstCoord.x, firstCoord.y);

    for (let xIndex = 2; xIndex < coords.length; xIndex += 2) {
      let yIndex = xIndex + 1;
    
      nextCoord.x = x + (coords[xIndex] * xScale);
      nextCoord.y = y + (coords[yIndex] * yScale);

      if (hasRotation) {
        nextCoord = Vector2.rotatePoint(nextCoord, rotation, shapePiv);
      }
      
      ctx.lineTo(nextCoord.x, nextCoord.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }

  // events
  /** @param {MouseEvent} event */
  function onMouseMove(event) {
    const mousePosition =  new Vector2(event.clientX, event.clientY);

    var isMouseOverAnyStar = false;

    allActiveStars.forEach( (star) => {
      if (star.isBlinking) {
        const distanceToStar = Vector2.distance(mousePosition, star.position);

        star.isMouseOver = distanceToStar < starHitboxSize;
        isMouseOverAnyStar = isMouseOverAnyStar || star.isMouseOver;
      }
    });

    domCanvas.style.cursor = isMouseOverAnyStar ? "pointer" : "default";
  }

  /** @param {MouseEvent} event */
  function onMouseClick(event) {
    if (isDay) return;

    const mousePosition = new Vector2(event.clientX, event.clientY);
    allActiveStars.forEach( (star) => attemptToClickStarAt(star, mousePosition) );
  }

  /** @param {KeyboardEvent} event */
  function onKeyboardPressed(event) {
    const isKeyR = event.key === "r";

    if (isKeyR) restartGame();
  }

  function onMorning() {
    resetDomToDaytime();
    resetAllStarsToBlinking();
    resetStarCounter();
  }

  function onDawn() {
    updateDom();
    resetAllStarsToBlinking();
  }
  
  // game methods
  function exposeGameVariableToHTML() {
    game.restart = () => restartGame();
  }

  /** @param {Star} star */
  /** @param {Vector2} mousePosition */
  function attemptToClickStarAt(star, mousePosition) {
    const distanceToStar = Vector2.distance(mousePosition, star.position);
      
    const isClickNotOverThisStar = distanceToStar < starHitboxSize == false;
    if (isClickNotOverThisStar) return;
        
    const hasStarAlreadyBeenClicked = star.isSpinning;
    if (hasStarAlreadyBeenClicked) return;
    
    clickStar(star);
  }

  /** @param {Star} star */
  function clickStar(star) {
    star.startSpinning();
    remainingStarCount--;
    updateDom();
    resetCursorToDefault();

    const areAllStarsClicked = remainingStarCount === 0;
    if (areAllStarsClicked) win();
  }

  function resetAllStarsToBlinking() {
    allActiveStars.forEach((star) => {
      star.startBlinking();
      star.rotation = 0;
    });
  }

  function resetDomToDaytime() {
    domRemainingStars.innerHTML = "??";
  }

  function updateDom() {
    domRemainingStars.innerHTML = `${remainingStarCount}`;
  }

  function resetStarCounter() {
    remainingStarCount = allActiveStars.length;;
  }

  function resetCursorToDefault() {
    domCanvas.style.cursor = "default";
  }

  function win() {
    isPaused = true;
    canRestart = true;
    document.getElementById("win-pannel").classList.remove("inactive");
  }

  function restartGame() {
    const cannotRestart = !canRestart;
    if (cannotRestart) return;
  
    document.getElementById("win-pannel").classList.add("inactive");
    isPaused = false;
    canRestart = false;
    isRestartting = true;
  }
})();