import * as THREE from 'three'
import * as d3 from 'd3'
import Globe from 'globe.gl'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'

import '@fortawesome/fontawesome-free/css/all.css';
import '@simonwep/pickr/dist/themes/monolith.min.css';
import Pickr from '@simonwep/pickr';
import './style.css';


var renderer, camera, scene, controls;

let mouseX=0;
let mouseY=0;
let windowHalfX = (window.innerWidth )/ 2;
let windowHalfY = (window.innerHeight ) / 2;


let globeBoxWidth = 750;
let globeBoxHeight = 750 ;

var globe;

const value = document.querySelector("#value")
const input = document.querySelector("#yearslider")
value.textContent = input.value

const pickr = Pickr.create({
    el: '.color-picker',
    theme: 'monolith',
    swatches: ['#d50838', '#2fe060', '#e49323', '#ccd625'],
    components: {
        preview: true,
        hue: true,
        interaction: {
            input: true,
            cancel:true,
            save: true
        }
    }
});

let cancelCallback = null;
pickr.on('swatchselect', (...args) => {
  let hexColor = `#${args[0].toHEXA()[0]}${args[0].toHEXA()[1]}${args[0].toHEXA()[2]}`;
  if (cancelCallback) { pickr.off('cancel', cancelCallback); }
  cancelCallback = (...cArgs) => {
    let colorIndex = pickr.options.swatches.indexOf(hexColor);
    if (colorIndex > -1) {
      pickr.removeSwatch(colorIndex);
      pickr.options.swatches.splice(colorIndex, 1);
    }
  };
  pickr.on('cancel', cancelCallback);
});


initGlobe(parseInt(value.textContent));

function initGlobe(year) {

  var colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([-25,38]);
  const getVal = feat => feat.properties.AverageTemperature

  function makeGlobe(){
    // fetch(`./files/geoClimateData0.geojson`).then(res => res.json()).then(countries =>
    //   {
    fetch('./files/geoClimateData1.geojson').then(res => res.json()).then(data1 => {
      fetch('./files/geoClimateData2.geojson').then(res => res.json()).then(data2 => {
        const countries = {
          type: data1.type,
          crs: data1.crs,
          features: [...data1.features, ...data2.features]
        };
        var countryFeaturesForYear = countries.features.filter(y => y.properties.Year === year)
        // var countryFeaturesForYear = countries.features ;
        globe = new Globe({
          waitForGlobeReady: true,
          //animateIn: true,
        });

        if (window.innerWidth < 700) {
          globe.camera().aspect = window.innerWidth / 500;
          globe.camera().updateProjectionMatrix();
          globe.width( window.innerWidth * .95 ).height( 500 * .95 )
        }
        else {
          globe.camera().aspect = globeBoxWidth / globeBoxHeight;
          globe.camera().updateProjectionMatrix();
          globe.width( globeBoxWidth ).height( globeBoxHeight )
        }
        globe.globeImageUrl('./files/8k_earth_nightmap.jpg')
        //.globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')

        .polygonsData(countryFeaturesForYear)
        //.polygonStrokeColor(() => '#222')
        //.polygonCapColor(feat => `#${Math.round(Math.random() * Math.pow(2, 24)).toString(16).padStart(6, '0')}`)
        .polygonCapColor(feat => colorScale(getVal(feat)))
        .polygonSideColor(() => '#f7c46c')
        .polygonLabel(({ properties: d }) => `
          <span class="hoverinfo">
            <p class="countryName">${d.Country.toUpperCase()}</p>
            <p class="countryTemp">${d.AverageTemperature.toFixed(2)}°</p>
          </span>
        `)

        .onPolygonHover(hoverD => globe
          .polygonAltitude(d => d === hoverD ? 0.07 : 0.01)
          .polygonCapColor(d => d === hoverD ? 'steelblue' : colorScale(getVal(d)))
        )
        .polygonsTransitionDuration(300)
        .showAtmosphere(false)

        (document.getElementById('globeViz'));
        input.addEventListener("input", (event) => {
          value.textContent = event.target.value
          globe.polygonsData(countries.features.filter(y => y.properties.Year === parseInt(value.textContent)))
        })

        var ambientLight = new THREE.AmbientLight(0x0cc0e8, 15);
        ambientLight.name = "myAmbientLight";
        globe.scene().add(ambientLight);
        globe.scene().background = new THREE.Color(0x000111);
        // globe.scene().background = new THREE.Color(0xffffff);

        globe.camera().aspect = globeBoxHeight / globeBoxHeight;
        globe.camera().updateProjectionMatrix();
        globe.camera().position.z = 290;
        globe.camera().position.y = 10;
        globe.camera().position.x = 60;

        controls = new OrbitControls(globe.camera(), globe.renderer().domElement);

        controls.enableDamping = true;
        controls.dynamicDampingFactor = 0.01;
        controls.enablePan = false;
        controls.minDistance = 150;
        controls.maxDistance = 500;
        controls.rotateSpeed = 0.5;
        controls.zoomSpeed = .75;
        globe.controls().autoRotate = false;
        window.addEventListener("resize", onWindowResize, false);

        document.getElementById("yellow-red").addEventListener('click', changeColor);
        document.getElementById("plasma").addEventListener('click', changeColor);
        document.getElementById("viridis").addEventListener('click', changeColor);
        document.getElementById("gold").addEventListener('click', changeColor);
        pickr.getRoot().root.addEventListener('click', changeToCustomColor);

        document.getElementsByClassName("material-symbols-outlined")[0].addEventListener('click', rotateGlobe);

        pickr.on('save', (...args) => {
          if (args[0] === null) {console.log('wow')}
          else {
            let color = `#${args[0].toHEXA()[0]}${args[0].toHEXA()[1]}${args[0].toHEXA()[2]}`;
            pickr.addSwatch(color);
            pickr.options.swatches.push(color);
          };
        });

        function changeToCustomColor() {
          const colorPoints = document.getElementsByClassName("colormap")
          for (let i=0; i<colorPoints.length; i++) {
            colorPoints[i].style.width = '17px';
          }
          const customInterpolator = createCustomInterpolatorBig(pickr.options.swatches);
          colorScale = d3.scaleSequential(customInterpolator).domain([-20, 35]);
          globe.polygonCapColor(feat => colorScale(getVal(feat))) ;
        }

        function changeColor(event) {
          const colorPoints = document.getElementsByClassName("colormap")
          for (let i=0; i<colorPoints.length; i++) {
            colorPoints[i].style.width = '17px';
          }
          event.target.style.width = '23px';
          if (event.target.id === 'yellow-red') {
            colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([-25,38]);
            globe.polygonCapColor(feat => colorScale(getVal(feat))) ;
          }
          else if (event.target.id === 'plasma') {
            colorScale = d3.scaleSequential(d3.interpolatePlasma).domain([-25,40]);
            globe.polygonCapColor(feat => colorScale(getVal(feat))) ;
          }
          else if (event.target.id === 'viridis') {
            colorScale = d3.scaleSequential(d3.interpolateViridis).domain([-25,35]);
            globe.polygonCapColor(feat => colorScale(getVal(feat))) ;
          }
          else if (event.target.id === 'gold') {
            const customInterpolator = createCustomInterpolatorBig(['#D33602', '#E59238', '#F4CA3E', '#B76E79']);
            colorScale = d3.scaleSequential(customInterpolator).domain([-20, 35]);
            globe.polygonCapColor(feat => colorScale(getVal(feat))) ;
          }
        }

        function createCustomInterpolatorBig(colorList) {
          const n = colorList.length-1;
          return function (t) {
            for (let i=0; i<n; i++) {
              if ( (i*1/n <= t)  &&  (t < (i+1)*1/n) ) { return d3.interpolate(colorList[i], colorList[i+1])((t - i*1/n) * n); }
            };
          }
        }

        function rotateGlobe() {
          globe.controls().autoRotate = !globe.controls().autoRotate;
        }
      });
    });
  }
  makeGlobe();


  document.getElementById('day-mode').addEventListener('click', changeMode);
  document.getElementById('night-mode').addEventListener('click', changeMode);

}

function changeMode(event) {
  if (event.target.id === 'day-mode') {

    document.getElementsByTagName('body')[0].style.backgroundColor = '#F8F0C9';
    // document.getElementsByTagName('body')[0].style.animation = 'clipAnimation 1s linear';
    document.getElementsByTagName('h1')[0].style.color = '#281C02';
    document.getElementsByClassName('year')[0].style.color = '#281C02';
    document.getElementsByClassName("material-symbols-outlined")[0].style.color = '#281C02';
    document.getElementById('day-mode').style.display = 'none';
    document.getElementById('night-mode').style.display = 'flex';
    document.getElementsByClassName('pcr-button')[0].style.filter = 'none';
    document.getElementsByClassName('pcr-button')[0].style.filter = 'invert(100%) sepia(3%) saturate(4917%)';
    globe.scene().background = new THREE.Color(0xF8F0C9);
    globe.scene().getObjectByName('myAmbientLight').intensity = 50;

  }
  else if (event.target.id === 'night-mode') {
    document.getElementsByTagName('body')[0].style.backgroundColor = '#000111';
    // document.getElementsByTagName('body')[0].style.animation = 'clipAnimation2 1s linear';
    document.getElementsByTagName('h1')[0].style.color = 'white';
    document.getElementsByClassName('year')[0].style.color = 'white';
    document.getElementsByClassName("material-symbols-outlined")[0].style.color = 'white';
    document.getElementById('night-mode').style.display = 'none';
    document.getElementById('day-mode').style.display = 'flex';
    document.getElementsByClassName('pcr-button')[0].style.filter = 'initial';
    globe.scene().background = new THREE.Color(0x000111);
    globe.scene().getObjectByName('myAmbientLight').intensity = 15;

  }

}


function onWindowResize() {
  if (window.innerWidth < globeBoxWidth) {
    globe.camera().aspect = window.innerWidth / 500;
    globe.camera().updateProjectionMatrix();
    globe.width( window.innerWidth * .95 ).height( 500 * .95 )
  }
  else {
    globe.camera().aspect = globeBoxWidth / globeBoxHeight;
    globe.camera().updateProjectionMatrix();
    globe.width( globeBoxWidth ).height( globeBoxHeight )
  }
}
