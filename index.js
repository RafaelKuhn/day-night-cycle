(function() {
  
  const DAY_NIGHT_DURATION_IN_SECONDS = 5;
  const CANVAS_BORDER_PIXELS = 3;
  const CANVAS_BORDER_COLOR = 'black';

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
  const sunset5 = {r:12, g:18, b:44}; // this is the ground
  
  // star path
  const starCoords = [
    -2, 0,
    -0.4367816092, 0.275862069, // g /** */
    -0.7, 0.7,
    -0.275862069, 0.4367816092, // f /** */
    0, 2,
    0.275862069, 0.4367816092, // k /** */
    0.7, 0.7,
    0.4367816092, 0.275862069, // l /** */
    2, 0,
    0.4367816092, -0.275862069, // j /** */
    0.7, -0.7,
    0.275862069, -0.4367816092, // i /** */
    0, -2,
    -0.275862069, -0.4367816092, // n /** */
    -0.7, -0.7,
    -0.4367816092, -0.275862069 // h /** */
  ];




  const domBody = document.body;
  
  const CALLS_PER_SECOND = 33;
  const MILLISECONDS_PER_SECOND = 1000;
  const DELAY_PER_INTERVAL_CALL = MILLISECONDS_PER_SECOND / CALLS_PER_SECOND;
  
  window.onload = function() {            
    init();

    setInterval(updateGradient, DELAY_PER_INTERVAL_CALL);
  }

  var canvas;
  var context;
  function init() {
    canvas = document.getElementById("main-canvas");
    canvas.style.border = `${CANVAS_BORDER_PIXELS}px solid ${CANVAS_BORDER_COLOR}`;
    context = canvas.getContext('2d');
    makeCanvasWholeScreen();

    domBody.onresize = () => makeCanvasWholeScreen();

    
  }
  function makeCanvasWholeScreen() {
    canvas.width = window.innerWidth - CANVAS_BORDER_PIXELS * 2;
    canvas.height = window.innerHeight - CANVAS_BORDER_PIXELS * 2;
  }

  var gradient;
  function updateGradient() {
    // sky
    
    var skyA = lerpColor(sunset1, sunrise1, normalizedCosineWave); // higher sky
    var skyB = lerpColor(sunset2, sunrise2,  normalizedCosineWave);
    var skyC = lerpColor(sunset3, sunrise3,  normalizedCosineWave);
    var skyD = lerpColor(sunset4, sunrise4,  normalizedCosineWave);
    var skyE = lerpColor(sunset5, sunrise5,  normalizedCosineWave); // lower ground

    gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `rgba(${skyA.r}, ${skyA.g}, ${skyA.b}, 1)`);
    gradient.addColorStop(0.5, `rgba(${skyB.r}, ${skyB.g}, ${skyB.b}, 1)`);
    gradient.addColorStop(0.8, `rgba(${skyC.r}, ${skyC.g}, ${skyC.b}, 1)`);
    gradient.addColorStop(0.9, `rgba(${skyD.r}, ${skyD.g}, ${skyD.b}, 1)`);
    gradient.addColorStop(1, `rgba(${skyE.r}, ${skyE.g}, ${skyE.b}, 1)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // sun and moon
    var sunAndMoonColor = lerpColor(moon, sun, normalizedCosineWave);

    gradient = context.createRadialGradient(0, 0, 290, 0, 0, 300);
    gradient.addColorStop(0, `rgba(${sunAndMoonColor.r}, ${sunAndMoonColor.g}, ${sunAndMoonColor.b}, 1)`);  
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // star
    drawStar({ x: canvas.width/2, y: canvas.height/2}, {x: 5 * normalizedCosineWave, y: 5 * normalizedCosineWave});
    
    animateCosineWave(DAY_NIGHT_DURATION_IN_SECONDS);
  }

  

  // linear interpolation
  var interpolation = 0; 
  function interpolate() {
    interpolation += 1 / (CALLS_PER_SECOND * halfAPeriodDuration);
    if (interpolation > 1) {
      interpolation = 0;
    }
  }

  // cosine wave interpolation 
  const TAU = 6.283185307179586;
  var angle = 0;
  var normalizedCosineWave = 0;
  var timeStart;
  function animateCosineWave(halfAPeriodDuration = 5) {
    halfAPeriodDuration *= 2;
    if (angle >= TAU) {
      angle = 0;
      console.log(`should be around ${DAY_NIGHT_DURATION_IN_SECONDS * 2} seconds w/o script suspension: ${(Date.now() - timeStart) / 1000} s`);
    }
    if (angle == 0) { timeStart = Date.now(); }
    
    const cos = Math.cos(angle)
    normalizedCosineWave = (1 + cos) / 2; // this is done to make cosine function go through { 1, 0, 1 } instead of { 1, -1, 1} (normalization to unitary value)
    
    const angleIncrementPerIteration = 1 / (CALLS_PER_SECOND * halfAPeriodDuration) * TAU;
    angle += angleIncrementPerIteration;
  }

  function lerpColor(colorA, colorB, t) {
    const result = {
      r: lerpValue(colorA.r, colorB.r, t),
      g: lerpValue(colorA.g, colorB.g, t),
      b: lerpValue(colorA.b, colorB.b, t)
    };

    // console.log(`from ${Object.values(colorA)} to ${Object.values(colorB)} -> ${Object.values(result)}`)

    return result
  }

  function lerpValue(a, b, t) {
    const result = a * (1 - t) + b * t;

    // console.log(`from ${a} to ${b}, t = ${t} -> ${result}`);

    return result;
  }

  // draw methods
  function drawStar(location, scale) {
    context.lineWidth= "5";
    context.strokeStyle = "white";
    context.fillStyle = "white";
    drawShape(location.x, location.y, scale.x, scale.y, starCoords);
  }
  function drawShape(x, y, xScale, yScale, coords) {
    context.beginPath();
    context.moveTo(x + (coords[0] * xScale), y + (coords[1] * yScale));
    for (let xIndex = 2; xIndex < coords.length; xIndex += 2) {
      let yIndex = xIndex + 1;
      context.lineTo(x + (coords[xIndex] * xScale), y + (coords[yIndex] * yScale));
    }
    context.closePath();
    context.stroke();
    context.fill();
  }


})();