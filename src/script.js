function Bubble(x, y, bubbleSize, u = 0, v = 0, rho = 1.2) {

  this.x = x;
  this.y = y;
  this.u = u;
  this.v = v;
  this.rho = rho;
  this.diameter = bubbleSize * 1.0e-2;
  this.mass = rho * ((1.0 / 6.0) * Math.PI * (this.diameter ** 3));
  this.fluid = {};
  this.forces = {};
  this.toBeDeleted = false;

  this.setFluidProp = function (rho = 998.02, mu = 1e-3) {
    this.fluid.rho = rho;
    this.fluid.mu = mu;
  }

  this.calcFluidInfo = function (vMax, width) {
    this.fluid.u = 0.0;
    this.fluid.v = vMax * (1.0 - ((this.x) ** 2) / (0.25 * (width ** 2)));
    this.fluid.dudt = 0.0;
    this.fluid.dvdt = 0.0;
    this.fluid.vort = -2.0 * vMax * this.x / (0.25 * (width ** 2));
    this.fluid.vortMag = Math.abs(this.fluid.vort);
  }

  this.calcForces = function () {

    // Drag force
    const velr = Math.sqrt((this.fluid.u - this.u) * (this.fluid.u - this.u) +
      (this.fluid.v - this.v) * (this.fluid.v - this.v));

    const Rep = (this.fluid.rho * this.diameter * velr) / this.fluid.mu;

    let Cd = 0.0;
    if (Rep > 0.0 && Rep <= 1.5) {
      Cd = 16.0 / Rep;
    } else if (Rep > 1.5 && Rep <= 80.0) {
      Cd = 14.9 / (Rep ** 0.78);
    } else if (Rep > 80.0 && Rep <= 1530.0) {
      Cd = 48.0 / Rep * (1 - 2.21 / (Rep ** 0.5)) + 1.86e-15 * (Rep ** 4.756);
    } else if (Rep > 1530.0) {
      Cd = 2.61;
    }

    // Shear lift force
    const Res = this.fluid.rho * (this.diameter ** 2) * this.fluid.vortMag / this.fluid.mu;

    const beta = Rep > 0.0 ? 0.5 * Res / Rep : 0.0;

    let Cls = 0.0;
    let termFls = 0.0;
    if (beta > 0.005 && beta < 0.4) {

      if (Rep <= 40.0) {
        Cls = (1.0 - 0.3314 * Math.sqrt(beta)) * Math.exp(-Rep / 10.0) + 0.3314 * Math.sqrt(beta);
      } else if (Rep > 40.0) {
        Cls = 0.0524 * Math.sqrt(beta * Rep);
      }

      termFls = 1.615 * this.diameter * this.fluid.mu * Math.sqrt(Res) / this.fluid.vortMag * Cls;
    }

    this.forces.termD = 0.75 * this.mass * Cd * Rep * this.fluid.mu / (this.rho * (this.diameter ** 2));
    this.forces.FlsX = termFls * ((this.fluid.v - this.v) * this.fluid.vort);
    this.forces.FlsY = termFls * ((this.u - this.fluid.u) * this.fluid.vort);
    this.forces.termVM = 0.5 * this.mass * (this.fluid.rho / this.rho);
  }

  this.updatePosition = function (dt) {

    const rungeKutta4 = function (dt, vb, mb, vf, dvf_dt, Fls, fD, fVM) {

      const calcAcceleration = (vb, mb, vf, dvf_dt, Fls, fD, fVM) =>
      (fD * (vf - vb) + Fls + fVM * dvf_dt) / (mb + fVM);

      const k1 = calcAcceleration(vb, mb, vf, dvf_dt, Fls, fD, fVM);
      const k2 = calcAcceleration((vb + k1 * dt / 2), mb, vf, dvf_dt, Fls, fD, fVM);
      const k3 = calcAcceleration((vb + k2 * dt / 2), mb, vf, dvf_dt, Fls, fD, fVM);
      const k4 = calcAcceleration((vb + k3 * dt), mb, vf, dvf_dt, Fls, fD, fVM);

      return (vb + (k1 + 2.0 * k2 + 2.0 * k3 + k4) * dt / 6.0);

    }

    const rk4Iter = 5;
    for (let n = 0; n < rk4Iter; n++) {

      this.u = rungeKutta4(dt / rk4Iter, this.u, this.mass,
        this.fluid.u, this.fluid.dudt,
        this.forces.FlsX, this.forces.termD, this.forces.termVM);

      this.v = rungeKutta4(dt / rk4Iter, this.v, this.mass, 
        this.fluid.v, this.fluid.dvdt, 
        this.forces.FlsY, this.forces.termD, this.forces.termVM);
    }

    this.x += this.u * dt;
    this.y += this.v * dt;

  }

  this.setBoundaryConditions = function (xi, xf, yf) {

    if (this.x < xi) {
      this.x = xi - (this.x - xi);
      this.u = -this.u;
    } else if (this.x >= xf) {
      this.x = xf - (this.x - xf);
      this.u = -this.u;
    }

    if (this.y >= yf) {
      this.y = 0;
    }
  }

}

function addBubbles(fluid, bubbles, bubblesFreq) {

    for (let n = 0; n < bubblesFreq; n++) {

      fluid.innerHTML += '<div class="bubble"></div>';

      const bubblesClass = document.getElementsByClassName("bubble");

      const initialXPos = Math.random() * 0.5 - 0.25;
      const initialYPos = 0.0;
      const bubbleSize = Math.random() * 0.7 + 0.2;
      const lastBubble = bubblesClass.length - 1;

      bubblesClass[lastBubble].style.left = `${(initialXPos + 0.25) * 200}%`;
      bubblesClass[lastBubble].style.bottom = `${initialYPos * 100 - 20}%`;
      bubblesClass[lastBubble].style.transform = `scale(${bubbleSize})`;

      bubbles.push(new Bubble(initialXPos, initialYPos, bubbleSize * 1.0e-2));
      
    }
      
}

function deleteBubbles(bubbles, bubblesToDelete) {
  
  const bubblesClass = document.getElementsByClassName("bubble");
  
  for (let j = 0; j < bubblesToDelete.length; j++) {
    const i = bubblesToDelete[j];
    bubblesClass[i].remove();
    bubbles.splice(i, 1);
  }
}

function trackBubbles(bubbles, Uinf, timeStep) {
  
  const bubblesClass = document.getElementsByClassName("bubble");
  const bubblesToDelete = [];

  for (let i = 0; i < bubbles.length; i++) {

    const bubble = bubbles[i];
    bubble.setFluidProp();
    bubble.calcFluidInfo(Uinf, 1);
    bubble.calcForces();
    bubble.updatePosition(timeStep);
    bubble.setBoundaryConditions(-0.25, 0.25, 1.2);
    
    bubblesClass[i].style.left = `${(bubble.x + 0.25) * 200}%`;
    bubblesClass[i].style.bottom = `${bubble.y * 100 - 20}%`;
  }
  
}

function popBubble(bubbles, clickedEl) {

  const bubblesClass = document.getElementsByClassName("bubble");

  for (let i = 0; i < bubbles.length; i++) {
    if (clickedEl === bubblesClass[i]) {
      bubblesClass[i].remove();
      bubbles.splice(i, 1);
    }
  }

}


function executeAnimation(fluid, bubbles) {
  
  const timeStep = 1.0e-4;
  const timeInterval = 1.0e-3;
  const Uinf = 1;
  const bubblesFreq = 1;
  const totalBubbles = 50;
  let counter = 0;
  
  function animation() {
    
    if (bubbles.length < totalBubbles && counter % 100 === 0) {
      addBubbles(fluid, bubbles, bubblesFreq);
    }

    for (let n = 0; n < timeInterval / timeStep; n++) {
      trackBubbles(bubbles, Uinf, timeStep);
    }
    
    counter++;
    
  }
  
  let myInterval;
  
  return {
    start() {
      myInterval = setInterval(animation, (timeInterval * 1000))
    },
    stop() {
      clearInterval(myInterval)
    }
  }
  
}

const fluid = document.querySelector(".fluid");
const bubbles = [];
const animation = executeAnimation(fluid, bubbles);

animation.start();

fluid.addEventListener("click", function (event) {
  animation.stop();
}, false);

fluid.addEventListener("dblclick", function (event) {
  console.log(bubbles.length)
  popBubble(bubbles, event.target);
  console.log(bubbles.length)
  animation.start();
}, false);
