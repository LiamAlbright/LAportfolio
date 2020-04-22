var states = {
  initialPose: "hidden",
  visible: { opacity: 1 },
  hidden: { opacity: 0 }
};

var itemStates = {
  initialPose: "rest",
  rest: {
    "box-shadow": "0px 0px 0px 0px #fff"
  },
  hover: {
    "box-shadow": "2px 2px 0px 0px #aaa"
  }
};

function digest(str) {
  var buf = new ArrayBuffer(str.length * 2),
    bufv = new Uint16Array(buf);
  for (i = 0; i < str.length; i++) {
    bufv[i] = str.charCodeAt(i);
  }
  return crypto.subtle.digest("SHA-256", buf);
}

function saveRoutes() {
  try {
    Array.from(document.getElementsByClassName("route-data")).forEach(function (
      el
    ) {
      var key = el.getAttribute("data-map-key"),
        value = el.getAttribute("data-map-value");
      if (!key || !value) return;
      window.localStorage.setItem("route:" + key, value);
    });
  } catch (e) {
    console.debug("failed to save routes");
  }
}

function lookupRoute(idx) {
  var result = null;
  try {
    if (!idx) idx = 0;
    result = window.localStorage.getItem("route:" + idx);
  } catch (e) {
    console.debug("failed to look up route", key);
  }
  return result;
}

function onClickProtected(e, idx) {
  var result, route;
  e.preventDefault();
  route = lookupRoute(idx);
  if (route !== null) {
    window.location = route;
    return;
  }
  result = prompt("Enter password");
  if (idx) {
    result += idx;
  }
  digest(result).then(function (hash) {
    hash = String.fromCharCode.apply(null, new Uint8Array(hash));
    let url = btoa(hash)
      .replace("=", "")
      .replace("+", "-")
      .replace("/", "_");
    console.log("hash:", url);
    window.location = url;
  });
}

function initGallery() {
  baguetteBox.run(".gallery");
}

window.onload = function () {
  var p = pose(document.querySelector(".no-fouc"), states),
    items;
  p.set("visible");
  items = document.querySelectorAll(".portfolio-item");
  Array.prototype.forEach.call(items, function (el) {
    var p = pose(el, itemStates);
    el.addEventListener("mouseover", function (e) {
      p.set("hover");
    });
    el.addEventListener("mouseout", function (e) {
      p.set("rest");
    });
  });
  startRender();
  saveRoutes();
  initGallery();
  AOS.init({
    duration: 1200
  });
};

function startRender() {
  // Pretty animation derived from:
  // https://github.com/Mamboleoo/DecorativeBackgrounds
  var canvas = document.querySelector("#scene");
  if (canvas === null) {
    return;
  }
  var width = canvas.offsetWidth,
    height = canvas.offsetHeight / 1.33;
  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
  renderer.setSize(width, height);
  renderer.setClearColor(new THREE.Color("#b7a57a"), 1);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  var loader = new THREE.TextureLoader();
  var texture = loader.load("images/dot1.png");

  var radius = 35;
  var sphereGeom = new THREE.IcosahedronGeometry(radius, 5);
  var dotsGeom = new THREE.Geometry();
  var positions = new Float32Array(sphereGeom.vertices.length * 3);
  for (var i = 0; i < sphereGeom.vertices.length; i++) {
    var vector = sphereGeom.vertices[i];
    animateDot(i, vector);
    dotsGeom.vertices.push(vector);
    vector.toArray(positions, i * 3);
  }

  function animateDot(index, vector) {
    // Use TweenMax because popmotion is too slow
    window.TweenMax.to(vector, 3, {
      x: 0,
      y: -3,
      z: 0,
      ease: Back.easeIn,
      delay:
        Math.abs(vector.x / radius) * 10.5 + Math.abs(vector.y / radius) * 2.5,
      repeat: -1,
      yoyo: true,
      yoyoEase: Back.easeIn,
      onUpdate: function () {
        updateDot(index, vector);
      }
    });
  }

  function updateDot(index, vector) {
    positions[index * 3] = vector.x;
    positions[index * 3 + 1] = vector.y;
    positions[index * 3 + 2] = vector.z;
  }

  function onResize() {
    canvas.style.width = "";
    canvas.style.height = "";
    width = canvas.offsetWidth;
    height = canvas.offsetHeight / 1.33;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  var rt;
  window.addEventListener("resize", function () {
    rt = clearTimeout(rt);
    rt = setTimeout(onResize, 200);
  });
  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      texture: {
        value: texture
      },
      resolution: {
        value: new THREE.Vector2(width, height)
      }
    },
    vertexShader: document.getElementById("wrapVertexShader").textContent,
    fragmentShader: document.getElementById("wrapFragmentShader").textContent,
    transparent: true
  });
  var bufferDotsGeom = new THREE.BufferGeometry();
  bufferDotsGeom.addAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  var dots = new THREE.Points(bufferDotsGeom, shaderMaterial);
  scene.add(dots);

  camera.position.set(0, -3, 15);
  var bounds = [5, 100];
  var dir = 0.025;
  function render(a) {
    dots.geometry.verticesNeedUpdate = true;
    dots.geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
    setTimeout(function () {
      requestAnimationFrame(render);
    }, 1000 / 24);
    camera.position.z += dir;
    if (camera.position.z < bounds[0] || camera.position.z > bounds[1]) {
      dir *= -1;
    }
  }
  requestAnimationFrame(render);
}
