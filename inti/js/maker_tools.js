var plotElement = document.getElementById('plot');
var drawing_enabled = false;
var lines = [], stickFigure = [], traceIndices =[], constellationLines = [], fileContents = [];

let selectedLineIndex = null, previousSelectedLineIndex = null; 
let curX, curY, initX, initY;
let constellationMidpoints = {};
let selectedStars = [], selectedStarNames = [];
let editModeStar = null;
const starOutputOne = document.getElementById('star-1');
const starOutputTwo = document.getElementById('star-2');
const starOutputThree = document.getElementById('star-3');
const editStarOne = document.getElementById('editstar-1');
const editStarTwo = document.getElementById('editstar-2');
const editStarThree = document.getElementById('editstar-3');

let lastPoint = null;
let starInputModeActive = false;
let currentStarInputIndex = 0, currentDSOInputIndex = 0;
    
//const window.culture.commonNames = {};

let LabelCount = 0;
let constellationLabels = {}; //, translations = {}, natives = {}, pronounces = {}, IPAs = {}, shorts = {};
let labelTranslated, labelNative, labelPronounce, labelIPA;
let LabelNames = [];

let Maximum_Right_Ascension, Minimum_Right_Ascension, Maximum_Declination, Minimum_Declination;
let Area_of_Hull;

let SaveAsCount = 0;
//const window.culture.constellationsList = [], window.culture.daftarkonstelasi = [];
let nomor = 0;
let Magnitude_Stickfigure = [];
let Bayer_Stickfigure = [];
let IAU_Stickfigure = [];
let Magnitude_InsideHull_One = [];
let Bayer_InsideHull_One = [];
let IAU_InsideHull_One = [];
let Magnitude_InsideHull_Two = [];
let Bayer_InsideHull_Two = [];
let IAU_InsideHull_Two = [];
let Magnitude_Vertex = [];


const sidebar = document.getElementById('sidebar');
const imagePreview = document.getElementById('image-preview');
const mainImage = document.getElementById('overlay-artwork');
const opacitySlider = document.getElementById('opacity-range');
const opacityInput = document.getElementById('opacity-number');
const opacityValue = document.getElementById('opacity-value');

const pixelOutputOne = document.getElementById('output-1');
const pixelOutputTwo = document.getElementById('output-2');
const pixelOutputThree = document.getElementById('output-3');
const editpixelOne = document.getElementById('editpix-1');
const editpixelTwo = document.getElementById('editpix-2');
const editpixelThree = document.getElementById('editpix-3');
let pixelCoordinates = [];
let currentPixel = 0;
let currentEditPixel = null;
let picture;
let UploadedImage;

let currentProject = {
    id: "",
    region: "",
    constellations: [],
    common_names: {}
};
let currentConstellation = null;

let Projeksaatini = {
    id: "",
    bagian: "",
    konstelasi: [],
    lokal: {}
};
let konstelasisekarang = null;



// Converting RA/Dec to 3D unit vectors
function raDecToVector(raDeg, decDeg) {
    const toRad = Math.PI / 180;
    const raAstronomical = -raDeg;
    const raRad = raAstronomical * toRad;
    const decRad = decDeg * toRad;
    const x = Math.cos(decRad) * Math.cos(raRad);
    const y = Math.cos(decRad) * Math.sin(raRad);
    const z = Math.sin(decRad);
    return {x,y,z};
}
function getUniquePoint (stickFigure) {
    const pointMap = new Map();
    stickFigure.forEach(segment => {
        segment.forEach(point => {
            const key = `${point.x},${point.y}`;
            if(!pointMap.has(key)) {
                pointMap.set(key, {ra: point.x, dec: point.y})
            }
        })
    })
    return Array.from(pointMap.values());
}
function computeLabelPos (stickFigure) {
    const uniquePoints = getUniquePoint(stickFigure);
    if (stickFigure.length === 0) {
        console.warn("No valid point in stickFigure");
        return null;
    }
    let sum = {x: 0, y: 0, z: 0}
    uniquePoints.forEach(point => {
        const vec = raDecToVector(point.ra, point.dec);
        sum.x += vec.x;
        sum.y += vec.y;
        sum.z += vec.z;
    });
    const avg = {
        x: sum.x / uniquePoints.length,
        y: sum.y / uniquePoints.length,
        z: sum.z / uniquePoints.length
    }
    const length = Math.sqrt(avg.x**2 + avg.y**2 + avg.z**2);
    if (length === 0) {
        console.warn("Centroid length nol");
        return { x: 0, y: 0, z: 1 };
    }
    const centroid = {
        x: avg.x / length,
        y: avg.y / length,
        z: avg.z / length
    }
    return centroid;
}
function vectorToRaDec(vec) {
    const x = vec.x;
    const y = vec.y;
    const z = vec.z;
    let raRad = Math.atan2(y,x);
    let raDeg = (raRad * 180 / Math.PI + 360) % 360;
    const visualRA = -raDeg
    const decRad = Math.asin(z);
    const decDeg = decRad * 180 / Math.PI;
    return{visualRA,decDeg}
}

function projectTo2d (points, centerVec) {
    const projected = [];
    points.forEach(point => {
        const v = raDecToVector(point.ra, point.dec);
        const projX = v.x;
        const projY = v.y;
        projected.push({px: projX, py: projY});
    })
    return projected;
}
function GiftWrapping(points2d) {
    if(points2d.length < 3) return points2d;
    let hull = [];
    let start = points2d.reduce((min, p, i) => p.px < points2d[min].px ? i : min, 0);
   let p = start, q;
    do {
        hull.push(points2d[p]);
        q = (p + 1) % points2d.length;
        for (let i = 0; i < points2d.length; i++) {
            if (orientations(points2d[p], points2d[i], points2d[q]) === -1) q = i;
        }
        p = q;
    } while (p !== start);
    return hull;
}
function orientations(p,q,r) {
    const val = (q.py - p.py) * (r.px - q.px) - (q.px - p.px) * (r.py - q.py);
    if (val === 0) return 0;
    return val > 0 ? 1 : -1;
}
function getxyz (hull2D, uniqueStars) {
    const vecToRaDecMap = new Map();
    uniqueStars.forEach(point => {
        const vec = raDecToVector(point.ra, point.dec);
        const key = `${vec.x},${vec.y}`;
        vecToRaDecMap.set(key, {visualRA: point.ra, decDeg: point.dec});
    })
    const hullRaDec = [];
    hull2D.forEach(hullpoint => {
        let found = false;
        for (const [key, raDec] of vecToRaDecMap.entries()) {
            const [xStr, yStr] = key.split(',');
            const x = parseFloat(xStr);
            const y = parseFloat(yStr);
            if (Math.abs(x - hullpoint.px) < 1e-10 && Math.abs(y - hullpoint.py) < 1e-10) {
                hullRaDec.push(raDec);
                found=true;
                break;
            }
        }
        if(!found) {console.warn("No matching hull point:", hullpoint);}
    })
    return hullRaDec;
}

function initConstellationTools() {
    document.getElementById('draw').addEventListener('click',function() {
        drawing_enabled = !drawing_enabled;
        var mode= drawing_enabled ? 'enabled' : 'disabled';
        console.log(`Drawing mode ${mode}`);
        if (drawing_enabled) {
            if(!window.culture.folderName) {
                alert("Please select a folder first in ")
            } else {
                document.getElementById('draw').children[0].src = 'inti/icon/pencilactive.png'
            }
        } else {
            document.getElementById('draw').children[0].src = 'inti/icon/pencil.png'
        }
    });

    plotElement.on('plotly_click', function(data){
        var point = data.points[0];

        const CNcontainer = document.getElementById('add-dso');
        if(CNcontainer.style.display === 'block') {
            if(point.curveNumber === 0 && starInputModeActive) {
                const selectedStarCN = {lon:point.lon, lat:point.lat};
                const selectedStarCNName = window.starData.text_array.find((hip, i) => {
                    const lon = window.starData.lon_array[i];
                    const lat = window.starData.lat_array[i];
                    return Math.abs(lon - selectedStarCN.lon) < 1e-6 && Math.abs(lat - selectedStarCN.lat) < 1e-6;
                });
                const inputContainer = document.getElementById(`inputStarManual - ${currentStarInputIndex -1}`);
                if(inputContainer) {
                    inputContainer.value = selectedStarCNName;
                }
            } 
        };

        const SCsidebar = document.getElementById('second-sidebar-container');
        if(!SCsidebar.classList.contains('hidden')) {
            if(editModeStar !== null) {
                selectedStars[editModeStar] = {lon:point.lon, lat:point.lat};

                selectedStarNames = selectedStars.map(point => {
                    return window.starData.text_array.find((hip, i) => {
                        const lon = window.starData.lon_array[i];
                        const lat = window.starData.lat_array[i];
                        return Math.abs(lon - point.lon) < 1e-6 && Math.abs(lat - point.lat) < 1e-6;
                    });
                }).filter(Boolean).map(term=>term.replace('HIP ',''));
                        
                if(editModeStar === 0) {
                    starOutputOne.innerHTML = `${selectedStarNames[0]}`;
                } else if (editModeStar === 1) {
                    starOutputTwo.innerHTML = `${selectedStarNames[1]}`;
                } else if (editModeStar === 2) {
                    starOutputThree.innerHTML = `${selectedStarNames[2]}`;
                }

                editModeStar = null;
                return;

            }
            selectedStars.push({lon:point.lon, lat:point.lat});

            selectedStarNames = selectedStars.map(point => {
                return window.starData.text_array.find((hip, i) => {
                    const lon = window.starData.lon_array[i];
                    const lat = window.starData.lat_array[i];
                    return Math.abs(lon - point.lon) < 1e-6 && Math.abs(lat - point.lat) < 1e-6;
                });
            }).filter(Boolean).map(term=>term.replace('HIP ', ''));

            if(selectedStars.length > 0) {
                starOutputOne.innerHTML = `${selectedStarNames[0]}`;
            }
            if(selectedStars.length > 1) {
                starOutputTwo.innerHTML = `${selectedStarNames[1]}`;
            }
            if(selectedStars.length > 2) {
                starOutputThree.innerHTML = `${selectedStarNames[3]}`;
            }
        }
    

        if (drawing_enabled){
            // DRAWING MODE : Use clicks to draw lines between stars
            if(point.curveNumber === 0) { // Ensure clicks are on stars 
                if(lastPoint) {
                    lines.push({x: lastPoint.lon, y: lastPoint.lat});
                    lines.push({x: point.lon, y: point.lat});

                    const offsetFactor = 0.02; // the offset is 0.02 degrees in both longitude and latitude directions
                    const deltaLon = lines[1].x - lines[0].x;
                    const deltaLat = lines[1].y - lines[0].y;
                    const distance = Math.sqrt(deltaLon * deltaLon + deltaLat * deltaLat);
    
                    if (distance < 0.0001) { // the distance is on degrees, which is equivalent to approximately 11.1 meters or 36.4 feet at the equator.
                        alert ("Point are too close. Try drawing a longer line.")
                        lines = []; // Reset the line array if the distance is too short
                        return;
                    }
    
                    const lonOffset = (deltaLon/distance) * offsetFactor;
                    const latOffset = (deltaLat/distance) * offsetFactor;
    
                    var lineTrace = {
                        type: 'scattergeo',
                        mode: 'lines',
                        hoverinfo: 'all',
                        hoveron: 'points+fills',
                        lon: [lines[0].x + lonOffset, lines[1].x - lonOffset],
                        lat: [lines[0].y + latOffset, lines[1].y - latOffset],
                        line: {
                            color:'#333399',
                            width:1.5,
                            opacity:0.25
                        },
                    };
    
                    Plotly.addTraces('plot',lineTrace).then(function(additionResult){
                        traceIndices.push(additionResult);
                        stickFigure.push([...lines]);
                        constellationLines.push([...lines]);
                        lines = [];
                    }).catch(function(error) {
                        console.error("Error adding trace:", error);
                        lines = []; // Reset an error
                    });
                }
                lastPoint = {lon:point.lon, lat:point.lat};
            }
        } else {
            // INTERACTION MODE : determine if a star or line was clicked
            if (point.curveNumber === 0) {
                // CLICK ON STAR : Show modal with star info
                var modal = document.getElementById('myModal');
                var modalContent = document.getElementById('modal-content');
                var latValue = window.starData.lat_array[point.pointIndex];
                var raValue = window.starData.ra_array[point.pointIndex];
                var magValue = window.starData.mag_array[point.pointIndex];
                var thetext = window.starData.text_array[point.pointIndex];
                modalContent.innerHTML = `<div class="pop-up"><span class="close">&times;</span><p>Clicked on: ${thetext}</p><p>Dec: ${latValue}</p><p>RA: ${raValue}</p><p>Mag: ${magValue}</p></div>`;
                modal.style.display = "block";
                var span = document.getElementsByClassName("close")[0];
                span.onclick = function() {
                    modal.style.display = "none";
                };
                window.onclick = function(event) {
                    if (event.target == modal) {
                        modal.style.display = "none";
                    }
                };
            } else if (point.curveNumber > 0) {
                // CLICK ON LINE : Select and highlight for deletion
                selectedLineIndex = point.curveNumber;
                if (previousSelectedLineIndex !== null && previousSelectedLineIndex !== selectedLineIndex) {
                    // Reset previous line style
                    Plotly.restyle('plot', {line: {width:2, opacity: 0.5, color:'#333399'}}, [previousSelectedLineIndex]);
                }
                // Highlight selected line
                Plotly.restyle('plot', {line:{width:5, opacity:1, color:'red'}}, [selectedLineIndex]);
                previousSelectedLineIndex = selectedLineIndex;
            }
        }
    });

    plotElement.on('plotly_click', function(data) {
        if(data.event.button === 2) { // Right-click
            if(drawing_enabled) {
                var point = data.points[0];
                if(point.curveNumber === 0) {
                    lastPoint = {lon:point.lon, lat:point.lat};
                    if(constellationLines.length>0) {
                        fileContents.push(constellationLines.map(p => [p.x, p.y]));
                        constellationLines = [];
                    }
                    lastPoint = null;
                }
            }
        }
    });
    
    document.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        lastPoint = null;
    });
    

    function setEditModeStar(index) {
        editModeStar = index;
    }
    editStarOne.addEventListener('click', function() {
        setEditModeStar(0);
    });
    editStarTwo.addEventListener('click', function() {
        setEditModeStar(1);
    });
    editStarThree.addEventListener('click', function() {
        setEditModeStar(2);
    });

    
    document.getElementById('delete').addEventListener('click', deletingLines);
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Delete') {
            deletingLines();
        }
    });


//  COMMON_NAMES SECTION
    document.getElementById('commonName').addEventListener('click', function() {
        if(!window.culture.folderName) {
            alert("Please select a folder first in ")
        } else {
            document.getElementById('add-dso').style.display= 'block';
        }
    });
    document.getElementById('cancel-commonName').addEventListener('click', function(){
        document.getElementById('add-dso').style.display = 'none';
        const container = document.getElementById('manual-input-container');
        container.innerHTML = '';

    });
    document.getElementById('Add-Star-Manual').addEventListener('click', function(){
        showInput('Stars');
        starInputModeActive = true;
        currentStarInputIndex++ ;
    });
    document.getElementById('Add-Planet-Manual').addEventListener('click', function(){
        showInput('Planet');
    });
    document.getElementById('Add-DSO-Manual').addEventListener('click', function(){
        showInput('Deep Sky Object');
    });
    document.getElementById('save-commonName').addEventListener('click', function(){
        const MultiplyInput = document.querySelectorAll('.multiply-input');
        MultiplyInput.forEach(input=> {
            const AddingManual = input.getAttribute('data-AddingManual');
            const objectSelect = input.querySelector('select');
            const objectInput = input.querySelectorAll('input[type="text"]');

            if(AddingManual === 'Stars') {
                const AddObject = objectInput[0].value.trim();
                const EnglishObject = objectInput[1].value.trim();
                const NativeObject = objectInput[2].value.trim();
                const PronounceObject = objectInput[3].value.trim(); 

                window.culture.commonNames[AddObject] = [{
                    english: EnglishObject,
                    native: NativeObject,
                    pronounce: PronounceObject,
                }];
            }
            else if(AddingManual === 'Planet') {
                const AddObject = objectSelect.value.trim();
                const EnglishObject = objectInput[0].value.trim();
                const NativeObject = objectInput[1].value.trim();
                const PronounceObject = objectInput[2].value.trim(); 
                const Commentary = objectInput[3].value.trim();

                window.culture.commonNames[`NAME ${AddObject}`] = [{
                    english: EnglishObject,
                    native: NativeObject,
                    pronounce: PronounceObject,
                    translators_comments: Commentary,
                }];
            } else if(AddingManual === 'Deep Sky Object') {
                const AddObject = objectInput[0].value.trim();
                const EnglishObject = objectInput[1].value.trim();
                const NativeObject = objectInput[2].value.trim();
                const PronounceObject = objectInput[3].value.trim(); 
                const Commentary = objectInput[4].value.trim();

                window.culture.commonNames[AddObject] = [{
                    english: EnglishObject,
                    native: NativeObject,
                    pronounce: PronounceObject,
                    translators_comments: Commentary,
                }];
            }
        })
        document.getElementById('add-dso').style.display = 'none';
        starInputModeActive = false;
        const container = document.getElementById('manual-input-container');
        container.innerHTML = '';
        const displaycontent = {
            id: window.culture.folderName,
            region: window.culture.regionName || "Unknown",
            classification: [window.culture.classificationName || "Personal"],
            fallback_to_international_names: false,
            constellations: window.culture.constellationsList || [],
            common_names: window.culture.commonNames || {},
        };
        apa = JSON.stringify(displaycontent,null,2);

        Stelarea.textContent = apa + '\n\n';
        Stelpopup.style.display = 'block';

    });

//LABEL
    document.getElementById('cancel-label').addEventListener('click', function(){
        document.getElementById('label-input').style.display = 'none';
    });
    document.getElementById('save-as').addEventListener('click', function(){
        if (stickFigure.length === 0 || stickFigure.every(line => line.length === 0)) {
            alert("No points available for labeling. Please draw some lines first.");
            return;
        }
        document.getElementById('label-input').style.display = 'block';
        function adjustInput(inputWidth) {
            const placeholder = inputWidth.getAttribute('placeholder').length;
            inputWidth.style.width = `${placeholder}ch`;
        }
        const inputs = document.querySelectorAll('input[type="text"]');
        inputs.forEach(adjustInput);
    });
    document.getElementById('save-label').addEventListener('click', function(){
        labelTranslated = document.getElementById('english').value.trim();
        labelNative = document.getElementById('native').value.trim();
        labelPronounce = document.getElementById('pronounce').value.trim();
        labelIPA = document.getElementById('ipa').value.trim();
        shortLabel = document.getElementById('short').value.trim();
/*
        if(translations[labelTranslated]) {
            alert("This English name already exists. Please choose a different name.");
            return;
        } else {
            translations[labelTranslated] = labelTranslated;
        }
        if(natives[labelNative]) {
            alert("This native name already exists. Please choose a different name.");
            return;
        } else {
            natives[labelNative] = labelNative;
        }
        if(pronounces[labelPronounce]) {
            alert("This pronounce name already exists. Please choose a different name.");
            return;
        } else {
            pronounces[labelPronounce] = labelPronounce;
        }
        if(IPAs[labelIPA]) {
            alert("This IPA name already exists. Please choose a different name.");
            return;
        } else {
            IPAs[labelIPA] = labelIPA;
        }
        if(shorts[shortLabel]) {
            alert("This abbreviation already exists. Please choose a different one");
            return;
        } else {
            shorts[shortLabel] = shortLabel;
        }
*/
        if(labelTranslated === '' || labelNative === '' ) {
            alert("Please fill at least the english and the native fields.");
            return;
        }
        const labelnumber = `${formatNum(++LabelCount)}`;
        const labelContent = `${labelnumber} "english": "${labelTranslated}", "native": "${labelNative}", "pronounce": "${labelPronounce}", "ipa": "${labelIPA}"`;

        if(labelTranslated && labelTranslated.trim() !== '') {
            LabelNames.push({labelTranslated, labelNative, labelPronounce, labelIPA});
        }


        // Calculate Max Min Coordinates
        let Real_DEmax, Real_DEmin, Real_RAmax, Real_RAmin;
        if(stickFigure.length > 0) {
            Real_DEmax = Math.max(...stickFigure.map(line => Math.max(...line.map(point => point.y))));
            Real_DEmin = Math.min(...stickFigure.map(line => Math.min(...line.map(point => point.y))));
            Real_RAmax = Math.max(...stickFigure.map(line => Math.max(...line.map(point => point.x))));
            Real_RAmin = Math.min(...stickFigure.map(line => Math.min(...line.map(point => point.x))));
        }

        // Wiki Data for Constellation Boundaries Reference
        Maximum_Declination = Real_DEmax;
        Minimum_Declination = Real_DEmin;
        Maximum_Right_Ascension = Math.abs(Real_RAmin);
        Minimum_Right_Ascension = Math.abs(Real_RAmax);

        const labelPos3D = computeLabelPos(stickFigure);
        const isinya = getUniquePoint(stickFigure);
        const labelPos2D = vectorToRaDec(labelPos3D);

        if (labelNative && labelNative.trim() !== '') {
            if(labelPos3D) {    
                const plotData = {
                    type:'scattergeo',
                    mode: 'text',
                    lon: [labelPos2D.visualRA],
                    lat: [labelPos2D.decDeg],
                    text: [labelNative],
                    textposition: "middle center",
                    textfont: {
                        color: '#6699e6',
                        size: 20,
                        opacity: 0.25
                    }
                };
                Plotly.addTraces('plot', plotData).then(() => {
                    Plotly.relayout('plot',{
                        'geo.scope': 'perspective'
                    });
                }).catch(function (error) {
                    console.error("Error adding text trace:", error);
                });
                const thelongitude = labelPos2D.visualRA;
                const thelatitude = labelPos2D.decDeg;

                constellationLabels[labelNative] = {thelongitude,thelatitude,labelnumber};
                updateConstellationOptions();
            }
        };

        const stickFigureFormatted = stickFigure.map(line => {
            const hipNumbers = line.map(point => {
                const index = window.starData.lon_array.findIndex((lon, i) => {
                    const lat = window.starData.lat_array[i];
                    return Math.abs(lon - point.x) < 1e-8 && Math.abs(lat - point.y) < 1e-8;
                })
                if (index === -1) {
                    console.warn("No point:", point);
                    return null;
                
                }
                const hipStr = window.starData.text_array[index];
                const hipNumber = hipStr.replace(/^HIP\s*/i, '').trim();
                return hipNumber;
            })
            return hipNumbers.filter(n => n !== null);
        })

        const commonNameObj = {english: labelTranslated, native: labelNative}
        if(labelPronounce) commonNameObj.pronounce = labelPronounce;
        if(labelIPA) commonNameObj.IPA = labelIPA;
        currentConstellation = {
            id: `CON ${window.culture.folderName} ${shortLabel}`,
            lines: stickFigureFormatted,
            common_name: commonNameObj
        };
        const isExisted = window.culture.constellationsList.some(k =>k.id === currentConstellation.id);
        if (!isExisted) {
            window.culture.constellationsList.push(currentConstellation);
        } else {
            console.warn("Already existed");
        }

        if(!window.culture.constellationsList.some(constellation => constellation.id === currentConstellation.id)) {
            window.culture.constellationsList.push(currentConstellation)
        }

        const uniqueStars = getUniquePoint(stickFigure);
        const center = computeLabelPos(stickFigure);
        const points2D = projectTo2d(uniqueStars, center);
        const hull2D = GiftWrapping(points2D);
        const hullRaDec = getxyz(hull2D,uniqueStars);
        const SATU = [];
        for (let i = 0; i < hullRaDec.length; i++) {
            const vertexPoint = hullRaDec[i];
            let adjustedLongitude = vertexPoint.visualRA;
            if (vertexPoint.visualRA < -360) {
                adjustedLongitude += 360;
            }
            const hip = window.starData.text_array.find((hip, index) => {
                return Math.abs(window.starData.lon_array[index] - adjustedLongitude) < 1e-6 && Math.abs(window.starData.lat_array[index] - vertexPoint.decDeg) < 1e-6;
            });
            if (hip) {
                SATU.push(hip.trim());
            }            
        }

        konstelasisekarang = {
            entitas: `CON ${window.culture.folderName} ${shortLabel}`,
            garis: stickFigureFormatted,
            koordinatgaris: stickFigure,
            centroid: labelPos2D,
            nama: commonNameObj,
            vertex: SATU,
            koordinathull: hullRaDec,
        }
        const sudahAda = window.culture.daftarkonstelasi.some(k =>k.entitas === konstelasisekarang.entitas);
        if (!sudahAda) {
            window.culture.daftarkonstelasi.push(konstelasisekarang);
        } else {
            console.warn("Constellation with this id is already exist, not re-adding it");
        }

        nomor = `${formatNum(++SaveAsCount)}`;

        const modi = JSON.parse(JSON.stringify(stickFigure));
        let minLong = Infinity;
        let maxLong = -Infinity;

        let hasLonRange1 = false; // -360<=x<=-270
        let hasLonRange2 = false; // -90<=x<=0 

        for (let i = 0; i < modi.length; i++) {
            for (let j = 0; j < modi[i].length; j++){
                let long = modi[i][j].x;
                if (long < minLong) minLong = long;
                if (long > maxLong) maxLong = long;

                if(long >= -360 && long <= -270) {
                    hasLonRange1 = true;
                }
                if(long >= -90 && long <= 0) {
                    hasLonRange2 = true;
                }
            }
        }
        if(hasLonRange1 && hasLonRange2) {
            for (let i = 0; i < modi.length; i++) {
                for (let j = 0; j < modi[i].length; j++) {
                    let long = modi[i][j].x;
                    if (long >= -180 && long <= 0) {
                        long += -360;
                    }
                    modi[i][j].x = long;
                }
            }
        }
//Batasnya
        const allPoints = modi.flat(); 
        const hull = convexHull(allPoints);
        const polygon = hull;
        const vertexHIPs = [];
        
        
        for (let i = 0; i < hull.length; i++) {
            const vertexPoint = hull[i];
            let adjustedLongitude = vertexPoint.x;
            if (vertexPoint.x < -360) {
                adjustedLongitude += 360;
            }
            const hip = window.starData.text_array.find((hip, index) => {
                return Math.abs(window.starData.lon_array[index] - adjustedLongitude) < 1e-6 && Math.abs(window.starData.lat_array[index] - vertexPoint.y) < 1e-6;
            });
            if (hip) {
                vertexHIPs.push(hip.trim());
            }            
        }
        for(let vertex of hull) {
            let mag = findMag(vertex.x, vertex.y);
            Magnitude_Vertex.push(mag);
        }

        Area_of_Hull = Number(shoelaceArea(hull).toFixed(2));


        //wholePoints is the data from csv
        const wholePoints = window.starData.lon_array.map((lon,index) => {
            return {x:lon, y:window.starData.lat_array[index]};
        });
        const pointsWithinHull = getPointsWithinHull(wholePoints,hull);

        const pointsInsideHull = [];

        //Find the point from sub-catalog inside the convexhull
        pointsWithinHull.forEach(pointWithinHull => {
            const isInside = stars_inside_hull_normal(polygon,pointWithinHull);
            if(isInside) {
//                console.log(`The point (${pointWithinHull.x}, ${pointWithinHull.y}) is inside the polygon.`);
                pointsInsideHull.push(pointWithinHull);
            } else {
//                console.log(`The point (${pointWithinHull.x}, ${pointWithinHull.y}) is outside the polygon.`);
            }
        });

        const starsInsideHull = [];

        // Find the second routine
        pointsWithinHull.forEach(mirror => {
            const isInside2 = stars_inside_hull_abnormal(hull,mirror);
            if(isInside2) {
//                console.log(`The point (${mirror.x}, ${mirror.y}) is inside the polygon.`);
                starsInsideHull.push(mirror);
            } else {
//                console.log(`The point (${mirror.x}, ${mirror.y}) is inside the polygon.`)
            }
        });

        const vertexCoordinates = hullRaDec.map(point => ({
            x: point.visualRA,
            y: point.decDeg
        }));
        let StarsHIP = [], StarsBayer = [], StarsIAU = [], StarsMag = [];
        const allpossibilityofStickFigure = stickFigure.flat();
        const allfromroutineone = pointsInsideHull.flat();
        const allfromroutinetwo = starsInsideHull.flat();
        const allfromvertex = vertexCoordinates.flat();

        const allcoordinates = [...allpossibilityofStickFigure, ...allfromroutineone, ...allfromroutinetwo];
        const AllUniqueCoordinates = Array.from(
            new Set(allcoordinates.map(JSON.stringify))
        ).map(JSON.parse);

        for (let star of AllUniqueCoordinates) {
            let designation = findingdesignation(star.x, star.y);
            StarsHIP.push(designation);
        }
        for (let star of AllUniqueCoordinates) {
            let name = searchStarName(star.x, star.y);
            StarsBayer.push(name);
        }
        for (let star of AllUniqueCoordinates) {
            let boundary = seacrhboundaryName(star.x, star.y);
            StarsIAU.push(boundary);
        }
        for (let star of AllUniqueCoordinates) {
            let magnitude = findMag(star.x, star.y);
            StarsMag.push(magnitude);
        }
      

        fileContents = constellationLines.map((line,index) => {
            const hips = new Set(line.map(point => {
                return window.starData.text_array.find((hip, i) => {
                    const lon = window.starData.lon_array[i];
                    const lat = window.starData.lat_array[i];
                    return Math.abs(lon - point.x) < 1e-6 && Math.abs(lat - point.y) < 1e-6;
                });
            }).filter(Boolean));
            return [...hips].map(hip=>hip.replace('HIP','').trim()).join(', ').trim();
        }).join(', ');

            function processValue(val) {
                if (typeof val !== 'number') {
                    throw new Error(`Coordinate value is not a number: ${val}`);
                }
                const str = val.toString();
                const parts = str.split('.');
                if (parts.length === 2) {
                    const decimalDigits = parts[1].length;
                    if (decimalDigits > 9) {
                        return parseFloat(val.toFixed(9));
                    } else {
                        return val;
                    }
                } else {
                    return val;
                }
            }
            function createKey(coord) {
                let arr;
                if (Array.isArray(coord)) {
                    arr = coord; 
                } else if (typeof coord === 'object' && coord !== null) {
                    arr = [coord.x, coord.y];
                } else {
                    throw new Error(`Invalid coordinate format: ${JSON.stringify(coord)}. Expected array or object with x, y.`);
                }
                const processed = arr.map(processValue);
                return processed.map(val => val.toString()).join(',');

            }

            const StickFigureSet = new Set(allpossibilityofStickFigure.map(co => createKey(co)));
            const VertexSet = new Set(allfromvertex.map(co => createKey(co)));
            const HullOneSet = new Set(allfromroutineone.map(co => createKey(co)));
            const HullTwoSet = new Set(allfromroutinetwo.map(co => createKey(co)));

            const everyStar = AllUniqueCoordinates.map((star, i) => {
                const key = createKey(star);
                let description = "Inside the Hull";
                if(VertexSet.has(key)) {
                    description = "Constellation lines (Vertex)";
                } else if (StickFigureSet.has(key)) {
                    description = "Constellation lines";
                } else if (HullOneSet.has(key)) {
                    description = "Inside the hull"
                } else if (HullTwoSet.has(key)) {
                    description = "Inside the hull"
                }
                return {
                    c : StarsHIP[i],
                    b : StarsBayer[i],
                    e : StarsMag[i],
                    d : description
                }
            });
            everyStar.sort((a, b) => a.e - b.e);
            const themain = everyStar[0].b;
            const smallestMag = everyStar[0].e;
            let brightStars = 0;
            everyStar.forEach(row => {
                if(row.e <= 3) {
                    brightStars++;
            }
            });
            let theBayer = 0;
            everyStar.forEach(row => {
                if(row.b && row.b !== '-') {
                    theBayer++;
                }
            });


            const totalstars = everyStar.length;

            let tableHTML = `
            <table id="mytbl" border="1" style="border-collapse: collapse;">
            <thead>
                <tr>
                    <th>id</th>
                    <th>Label</th>
                    <th>IAU design.</th>
                    <th>description</th>
                    <th>Vmag</th>
                </tr>
            </thead>
            <tbody>`;
            everyStar.forEach((row, index) => {
                tableHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${row.b}</td>
                    <td>${row.c}</td>
                    <td>${row.d}</td>
                    <td>${row.e}</td>
                </tr>`;
            });
            tableHTML += `</tbody></table>`;
            
            const boundaries = [...StarsIAU].filter(b => b !== '-');
            const IAUboundaries = [...new Set(boundaries)].join(', ');
            const allRA = `${Minimum_Right_Ascension} to ${Maximum_Right_Ascension}`;
            const allDE = `${Minimum_Declination} to ${Maximum_Declination}`;
            let infobox = 
            `<table border="1" style="border-collapse: collapse;">
            <tbody>
                <tr><td>name </td><td>${labelNative}  (${labelPronounce})</td></tr>
                <tr><td>native </td><td> ${labelNative}</td></tr>
                <tr>    <td>translation </td><td>${labelTranslated}</td></tr>
                <tr>    <td>pronounce </td><td>${labelPronounce}</td></tr>
                <tr>    <td>IPA </td><td>${labelIPA}</td></tr>
                <tr>    <td>culture </td><td>${window.culture.folderName}</td></tr>
                <tr>    <td>RA </td><td> ${allRA}</td></tr>
                <tr>    <td>dec </td><td> ${allDE}</td></tr>
                <tr>    <td>areatotal </td><td> ${Area_of_Hull}</td></tr>
                <tr>    <td>numbermainstars </td><td> ${totalstars}</td></tr>
                <tr>    <td>numberbfstars </td><td> ${theBayer}</td></tr>
                <tr>    <td>numberstarsplanets </td><td> <!-- X (Y with candidates); X being the number of stars with confirmed planets, Y being the number of stars with solid candidate planets without confirmed planets --></td></tr>
                <tr>    <td>numberbrightstars </td><td> ${brightStars}</td></tr>
                <tr>    <td>numbernearbystars </td><td> <!-- Number of stars that are closer than 10pc ( distance < 10 parsecs ) --></td></tr>
                <tr>    <td>brighteststarname </td><td> ${themain}</td></tr>
                <tr>    <td>starmagnitude </td><td> ${smallestMag}</td></tr>
                <tr>    <td>neareststarname </td><td><!-- content --></td></tr>
                <tr>    <td>stardistance </td><td><!-- content --></td></tr>
                <tr>    <td>numbermessierobjects </td><td><!-- content --></td></tr>
                <tr>    <td>meteorshowers </td><td><!-- content --></td></tr>
                <tr>    <td>bordering </td><td>${IAUboundaries}</td></tr>   
                <tr><td>notes </td><td><!-- content --></td></tr>
            </tbody></table>`;

        const vertexesContent = `${labelNative} Infobox:
${infobox}
`;

        if(!window.appState.vertexesTab) {
            window.appState.vertexesTab = window.open();
            window.appState.vertexesTab.document.write(`
                <html>
                    <head>
                        <title>Vertex info</title>
                    </head>
                    <body>
                        ${vertexesContent}
                    </body>
                </html>
                `);
//            window.appState.vertexesTab.document.write('<pre>' + vertexesContent + '</pre>');
//            window.appState.vertexesTab.document.title = 'Vertexes HIP';
            window.appState.vertexesTab.document.close();
        } else {
            window.appState.vertexesTab.document.body.innerHTML += '\n' + vertexesContent;
            //window.appState.vertexesTab.document.body.innerHTML +='<pre>' + vertexesContent + '</pre>'; querySelector('pre')
        }

        const insideContent = `${labelNative} Infotable:
${tableHTML}
        `;

        if(!window.appState.insideTab) {
            window.appState.insideTab = window.open();
            window.appState.insideTab.document.write(insideContent); //'<pre>' + insideContent + '</pre>'
            window.appState.insideTab.document.title = 'Star Lists';
            window.appState.insideTab.document.close();
        } else {
            window.appState.insideTab.document.body.innerHTML += '\n' + insideContent;//'<pre>' + insideContent + '</pre>';
        }
        

        stickFigure = [];
        constellationLines = [];
        lastPoint = null;        
        document.getElementById('english').value = '';
        document.getElementById('native').value = '';
        document.getElementById('pronounce').value = '';
        document.getElementById('ipa').value = '';
        document.getElementById('label-input').style.display = 'none';

        const displaycontent = {
            id: window.culture.folderName,
            region: window.culture.regionName || "Unknown",
            classification: [window.culture.classificationName || "Personal"],
            fallback_to_international_names: false,
            constellations: window.culture.constellationsList || [],
            common_names: window.culture.commonNames || {},
        };
        apa = JSON.stringify(displaycontent,null,2);

        Stelarea.textContent = apa + '\n\n';
        Stelpopup.style.display = 'block';
        
    });
    const Stelarea = document.getElementById('index-Content')
    const Stelpopup = document.getElementById('popup-Stellarium');
    const Stelheader = document.getElementById('popupHeader-Stellarium');
    Stelheader.addEventListener('mousedown', dragstart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragend)
    function dragstart (e) {
        initX = e.clientX - Stelpopup.offsetLeft;
        initY = e.clientY - Stelpopup.offsetTop;
        isDragging = true;
    }
    function drag(e) {
        if(isDragging) {
            e.preventDefault();
            curX = e.clientX - initX;
            curY = e.clientY - initY;
            Stelpopup.style.left = curX + 'px';
            Stelpopup.style.top = curY + 'px';
            Stelpopup.style.right = 'auto';
        }
    }
    function dragend() { isDragging = false; }
    document.getElementById('close-popupStel').addEventListener('click', function() {
        console.log("klik")
        Stelpopup.style.display = 'none';
    })


// IMAGES DEALING
    document.getElementById('image').addEventListener('click', () => {
        document.getElementById('image-upload').click();
        sidebar.classList.remove('hidden');
        document.getElementById('first-sidebar-container').classList.remove('hidden');
        document.getElementById('second-sidebar-container').classList.add('hidden');       
    });

    const closeSidebar = document.querySelector('.close-sidebar');
    closeSidebar.addEventListener('click', function() {
        sidebar.classList.add('hidden');
    });
    
    let actualwidth = '';
    let actualheight = '';
    document.getElementById('image-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        picture = file.name;
        const reader = new FileReader();
        reader.onload = (event) => {
            UploadedImage = event.target.result;        
            const image = new Image();
            image.onload = () => {  
                actualwidth = image.naturalWidth;
                actualheight = image.naturalHeight;
                image.style.opacity = opacitySlider.value;
                mainImage.opacity = opacitySlider.value;
                theImageOpacity = opacitySlider.value;
                const previewImage = new Image();
                previewImage.src = image.src;
                mainImage.src = image.src;
                previewImage.style.width = '100%';
                previewImage.style.height = '100%';
                previewImage.style.objectFit = 'cover';
                imagePreview.innerHTML = '';
                imagePreview.appendChild(previewImage);
                
                previewImage.addEventListener('click', (e) => {
                    const rect = previewImage.getBoundingClientRect();
                    const x = Math.floor((e.clientX - rect.left) / rect.width * previewImage.naturalWidth);
                    const y = Math.floor((e.clientY - rect.top) / rect.height * previewImage.naturalHeight);
                    if(currentEditPixel !== null) {
                        pixelCoordinates[currentEditPixel] = `${x} ${y}`;
                        currentEditPixel = null;
                    } else if (currentPixel < 3) {
                        pixelCoordinates.push(`${x} ${y}`);
                        currentPixel++;
                    }
                    updatePixelOutput();
                });
                document.getElementById('first-sidebar-container').classList.add('hidden');
                document.getElementById('second-sidebar-container').classList.remove('hidden');
            };
            image.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    let ZoomLevel = 1;
    const ZoomStep = 0.1;
    document.getElementById('zoom-in').addEventListener('click', () => {
        ZoomLevel += ZoomStep;
        updateImageTransform();
    });
    document.getElementById('zoom-out').addEventListener('click', () => {
        ZoomLevel -= ZoomStep;
        updateImageTransform();
    });
    document.getElementById('zoom-reset').addEventListener('click', () => {
        ZoomLevel = 1;
        updateImageTransform();
    });
    document.getElementById('replace-button').addEventListener('click', () => {
        document.getElementById('replace-image').click();
    })

    function updateImageTransform() {
        imagePreview.style.transform = `scale(${ZoomLevel})`;
        const offsetX = (imagePreview.offsetWidth * ZoomLevel - imagePreview.offsetWidth);
        const offsetY = (imagePreview.offsetHeight * ZoomLevel - imagePreview.offsetHeight);
        document.getElementById('kotak').scrollLeft = offsetX;
        document.getElementById('kotak').scrollTop = offsetY;
    }

    document.getElementById('replace-image').addEventListener('change', (e) => {
        const file = e.target.files[0];
        picture = file.name;
        const reader = new FileReader();
        reader.onload = (event) => {
            UploadedImage = event.target.result;
            const image = new Image();
            image.onload = () => {
                image.style.opacity = opacitySlider.value;
                mainImage.opacity = opacitySlider.value;
                theImageOpacity = opacitySlider.value;
                const previewImage = new Image();
                previewImage.src = image.src;
                mainImage.src = image.src;
                previewImage.style.width = '100%';
                previewImage.style.height = '100%';
                previewImage.style.objectFit = 'cover';
                imagePreview.innerHTML = '';
                imagePreview.appendChild(previewImage);
                previewImage.addEventListener('click', (e) => {
                    const rect = previewImage.getBoundingClientRect();
                    const x = Math.floor((e.clientX - rect.left) / rect.width * previewImage.naturalWidth);
                    const y = Math.floor((e.clientY - rect.top) / rect.height * previewImage.naturalHeight);
                    if(currentEditPixel !== null) {
                        pixelCoordinates[currentEditPixel] = `${x} ${y}`;
                        currentEditPixel = null;
                    } else if (currentPixel < 3) {
                        pixelCoordinates.push(`${x} ${y}`);
                        currentPixel++;
                    }
                    updatePixelOutput();
                });
            };
            image.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
    
        
    opacitySlider.addEventListener('input', (e) => {
        const value = e.target.value;
        opacityValue.textContent = value;
        opacityInput.value = value;
        const previewImage = imagePreview.querySelector('img');
        if (previewImage) {
            previewImage.style.opacity = value;
            mainImage.style.opacity = value;
        }
    });

    opacityInput.addEventListener('input', (e) => {
        const value = e.target.value;
        opacityValue.textContent = value;
        opacitySlider.value = value;
        const previewImage = imagePreview.querySelector('img');
        if(previewImage) {
            previewImage.style.opacity = value;
            mainImage.style.opacity = value;
        }
    });

    function updateConstellationOptions() {
        const selectElement = document.getElementById('constellation-select');
        selectElement.innerHTML = '';

        const defaultOptionElement = document.createElement('option');
        defaultOptionElement.value = '';
        defaultOptionElement.textContent = 'Select a constellation';
        selectElement.appendChild(defaultOptionElement);

        Object.keys(constellationLabels).forEach(label => {
            const optionElement = document.createElement('option');
            optionElement.value = label;
            optionElement.textContent = label;
            selectElement.appendChild(optionElement);
        });

        Object.keys(constellationMidpoints).forEach(label => {
            const optionElement = document.createElement('option');
            optionElement.value = label;
            optionElement.textContent = label;
            selectElement.appendChild(optionElement);
        });
    }


    document.getElementById('constellation-select').addEventListener('change', function() {
        const selectedLabel = this.value;
        
        if(selectedLabel) {
            const position = constellationLabels[selectedLabel] || constellationMidpoints[selectedLabel];
            const number = position.labelnumber || position.starnumber;
            let maxLon, minLon, DEmax, DEmin, RAmax, RAmin;
            let RAtotal = 0;
            let DEtotal = 0;

/*            if(window.appState.vertexesTab && !window.appState.vertexesTab.closed) {
                const vertexesContent = window.appState.vertexesTab.document.body.innerText;
                const readVertexesLines = vertexesContent.trim().split('\n');
                const listofHIP = {};
                readVertexesLines.forEach(line => {
                    const parts = line.split(' ');
                    const order = parts[0];
                    const hipslist = parts.slice(1).join(' ');
                    listofHIP[order] = hipslist; 
                });  
                if(listofHIP[number]) {
                    const listing = listofHIP[number];
                    const listingArray = listing.split(',').map(hip => hip.trim());
                    const points = listingArray.map(hip => {
                        const pointIndex = window.starData.text_array.findIndex((t) => t === hip);
                        if(pointIndex === -1) {
                            return null;
                        }
                        return {x:window.starData.lon_array[pointIndex], y:window.starData.lat_array[pointIndex]};
                    }).filter(point => point !== null);
                    if (points.length > 0) {
                        const lons = points.map(point => point.x);
                        const lats = points.map(point => point.y);

                        maxLon = Math.max(...lons);
                        minLon = Math.min(...lons);
                        DEmax = Math.max(...lats);
                        DEmin = Math.min(...lats);
                        if(maxLon <= 0 &&  minLon >= -360) {
                            const lonDiff = minLon - maxLon;
                            if (lonDiff < -180) {
                                lons.forEach((lonValue,index) => {
                                    if (lonValue > -180) {
                                        lons[index] = lonValue - 360;
                                    }
                                });
                            }
                        }
                        maxLon = Math.max(...lons); // -350
                        minLon = Math.min(...lons); // -370
                        if(minLon < -360) {
                            RAmax = maxLon + 360;
                            RAtotal = (maxLon - minLon)*-1;
                            RAmin = minLon + 360;
                        } else {
                            RAmax = maxLon;
                            RAmin = minLon;
                            RAtotal = (RAmax - RAmin);
                        }
                        //RAtotal = (RAmax - RAmin);
                        DEtotal = (DEmax - DEmin); 
                    }
                } 
            }*/

            if (position) {
                const avgLon = position.avgLon || position.firstLon;
                const avgLat = position.avgLat || position.firstLat;

                document.getElementById('pixel-coordinates').classList.remove('hidden');
                document.getElementById('second-sidebar-container').classList.add('show-overflow');

                let lonRange;
                if(RAtotal > 0) {
                    lonRange = [avgLon - 0.5*RAtotal, avgLon + 0.5*RAtotal];
                } else {
                    lonRange = [0.5*RAtotal + avgLon, 0.5*RAtotal + avgLon];
                }
                const latRange = [avgLat - 0.5*DEtotal, avgLat + 0.5*DEtotal];   
    
                Plotly.relayout('plot', {
                    'geo.center.lon': avgLon,
                    'geo.center.lat': avgLat,
                    'geo.projection.type': 'perspective', 
                    'geo.lonaxis.range' : lonRange,
                    'geo.lataxis.range' : latRange,
                });
            }
        } else {
            document.getElementById('pixel-coordinates').classList.add('hidden');
            document.getElementById('second-sidebar-container').classList.remove('show-overflow');
    
        }
    });


    editpixelOne.addEventListener('click', () => {
        currentEditPixel = 0;
    });
    editpixelTwo.addEventListener('click', () => {
        currentEditPixel = 1;
    });
    editpixelThree.addEventListener('click', () => {
        currentEditPixel = 2;
    });

    function updatePixelOutput() {
        if(pixelCoordinates.length > 0) {
            pixelOutputOne.textContent = pixelCoordinates[0];
        }
        if(pixelCoordinates.length > 1) {
            pixelOutputTwo.textContent = pixelCoordinates[1];
        }
        if(pixelCoordinates.length > 2) {
            pixelOutputThree.textContent = pixelCoordinates[2];
        }
    };




    var displaying_enabled = false;

    document.getElementById('display-image').addEventListener('click', () => {
        displaying_enabled = !displaying_enabled;
        var mode = displaying_enabled ? 'enabled' : 'disabled';
        console.log(`Displaying mode ${mode}`);
        if(displaying_enabled) {
            document.getElementById('display-image').style.backgroundColor = 'orange';
            document.getElementById('artwork-container').classList.remove('hidden');

            const opac = opacitySlider.value;

            const controlPoints = [
                {lat: selectedStars[0].lat, lon: selectedStars[0].lon, imgX: parseFloat(pixelCoordinates[0].split(' ')[0]), imgY: parseFloat(pixelCoordinates[0].split(' ')[1])},
                {lat: selectedStars[1].lat, lon: selectedStars[1].lon, imgX: parseFloat(pixelCoordinates[1].split(' ')[0]), imgY: parseFloat(pixelCoordinates[1].split(' ')[1])},
                {lat: selectedStars[2].lat, lon: selectedStars[2].lon, imgX: parseFloat(pixelCoordinates[2].split(' ')[0]), imgY: parseFloat(pixelCoordinates[2].split(' ')[1])},
            ]
            function calculateTransform(points) {
                const A = [
                    [points[0].imgX, points[0].imgY, 1, 0, 0, 0],
                    [0, 0, 0, points[0].imgX, points[0].imgY, 1],
                    [points[1].imgX, points[1].imgY, 1, 0, 0, 0],
                    [0, 0, 0, points[1].imgX, points[1].imgY, 1],
                    [points[2].imgX, points[2].imgY, 1, 0, 0, 0],
                    [0, 0, 0, points[2].imgX, points[2].imgY, 1]
    
                ];
                const B = [
                    points[0].lon,
                    points[0].lat,
                    points[1].lon,
                    points[1].lat,
                    points[2].lon,
                    points[2].lat
                ];
                // Solve the system A * X = B
                function solve(A, B) {
                    const n = A.length;
                    
                    for (let i = 0; i < n; i++) {
                        let maxEl = Math.abs(A[i][i]);
                        let maxRow = i;
                        for (let k = i + 1; k < n; k++) {
                            if (Math.abs(A[k][i]) > maxEl) {
                                maxEl = Math.abs(A[k][i]);
                                maxRow = k;
                            }
                        }
                        
                        for (let k = i; k < n; k++) {
                            const tmp = A[maxRow][k];
                            A[maxRow][k] = A[i][k];
                            A[i][k] = tmp;
                        }
                        const tmp = B[maxRow];
                        B[maxRow] = B[i];
                        B[i] = tmp;
                        
                        for (let k = i + 1; k < n; k++) {
                            const c = -A[k][i] / A[i][i];
                            for (let j = i; j < n; j++) {
                                if (i === j) {
                                    A[k][j] = 0;
                                } else {
                                    A[k][j] += c * A[i][j];
                                }
                            }
                            B[k] += c * B[i];
                        }
                    }
                    
                    const X = new Array(n);
                    for (let i = n - 1; i >= 0; i--) {
                        X[i] = B[i] / A[i][i];
                        for (let k = i - 1; k >= 0; k--) {
                            B[k] -= A[k][i] * X[i];
                        }
                    }
                    return X;
                }
                
                const X = solve(A, B);
                
                return [
                    [X[0], X[1], X[2]],  // Row 1 (for lon)
                    [X[3], X[4], X[5]],  // Row 2 (for lat)
                    [0, 0, 1]            // Row 3 (homogeneous)
                ];
            }
            const transformMatrix = calculateTransform(controlPoints);
            // 3. Function to transform image coordinates to geographic coordinates 
            function imageToMap(x, y) {
                const vec = [x, y, 1];
                const lon = transformMatrix[0][0] * vec[0] + transformMatrix[0][1] * vec[1] + transformMatrix[0][2] * vec[2];
                const lat = transformMatrix[1][0] * vec[0] + transformMatrix[1][1] * vec[1] + transformMatrix[1][2] * vec[2];
                return [lat, lon];
            }
            // 4. Calculate bounds for the overlay
            const topLeft = imageToMap(0, 0);
            const topRight = imageToMap(actualwidth, 0);
            const bottomLeft = imageToMap(0, actualheight);
            const bottomRight = imageToMap(actualwidth, actualheight);
    
            // 5. Prepare Plotly data
            const plotlyData = [            
                // Image overlay
                {
                    type: "scattermapbox",
                    mode: "markers",
                    lat: [topLeft[0], topRight[0], bottomRight[0], bottomLeft[0]],
                    lon: [topLeft[1], topRight[1], bottomRight[1], bottomLeft[1]],
                    marker: {
                        size: 0  // Hide the markers
                    },
                    fill: "toself",
                    fillcolor: 'rgba(0,0,0,0)',
                    hoverinfo: "none",
                    showlegend: false
                },
                
                // Control points
                {
                    type: "scattermapbox",
                    mode: "markers+text",
                    lat: controlPoints.map(p => p.lat),
                    lon: controlPoints.map(p => p.lon),
                    textposition: "top right",
                    marker: {
                        size: 12,
                        color: 'red'
                    },
                    name: "Control Points",
                    hoverinfo: "text",
                    hovertext: controlPoints.map(p => `Image: (${p.imgX}, ${p.imgY})`)
                }
            ];
            
            // 6. Create the layout with the image overlay
            const layout = {
                mapbox: {
                    style: "white-bg",  // or use "white-bg" for no base map
                    center: {
                        lat: controlPoints[0].lat,
                        lon: controlPoints[0].lon
                    },
                    background: "#0D1130",
                    zoom: 14,
                    layers: [{
                        sourcetype: "image",
                        source: UploadedImage,  // Replace with your image URL
                        coordinates: [
                            [topLeft[1], topLeft[0]],      // NW
                            [topRight[1], topRight[0]],      // NE
                            [bottomRight[1], bottomRight[0]], // SE
                            [bottomLeft[1], bottomLeft[0]]   // SW
                        ],   
                        opacity: opac,
                        below: "traces"  // Show below other data
                    }]
                },
                margin: {"r":0,"t":0,"l":0,"b":0},
                showlegend: false
            };
            
            // 7. Create the Plotly map
            Plotly.newPlot('overlay-map', plotlyData, layout);
    
            var plotDiv = document.getElementById('overlay-map');
            plotDiv.style.display='block';
    
            
        } else {
            document.getElementById('display-image').style.backgroundColor = 'white';
            document.getElementById('artwork-container').classList.add('hidden');
            removeImagePlot();
        }
        const selectedLabel = document.getElementById('constellation-select').value;
        const position = constellationLabels[selectedLabel] || constellationMidpoints[selectedLabel];
        const MidLon = position.avgLon || position.firstLon;
        const MidLat = position.avgLat || position.firstLat;

    });   


    function removeImagePlot() {
        Plotly.purge('overlay-map');
        var plotDiv = document.getElementById('overlay-map');
        plotDiv.style.display='none';
    }

    document.getElementById('save-coor').addEventListener('click', async () => {
        const selectedLabel = document.getElementById('constellation-select').value;
        const position = constellationLabels[selectedLabel] || constellationMidpoints[selectedLabel];
        const number = position.labelnumber || position.starnumber;
        
        const targetID = `CON ${window.culture.folderName} ${number}`;
        const existingEntry = window.culture.constellationsList.find(m=>m.id === targetID);
        const anchorsArray = [];
        for (let y = 0; y < pixelCoordinates.length; y++) {
            const coordStr = pixelCoordinates[i];
            const [xStr, yStr] = coordStr.split(/\s+/);

            const x = parseFloat(xStr);
            const y = parseFloat(yStr);

            if (isNaN(x) || isNaN(y)) {
                console.warn(`Koordinat invalid pada index ${i}: ${coordStr}`);
                continue;
            }
            const hip = selectedStarNames[i] ? parseInt(selectedStarNames[i], 10) : null;
            anchorsArray.push({pos: [x, y], hip: hip});
        }

        currentConstellation.image = {
            file: picture,
            size: [actualwidth, actualheight],
            anchors: anchorsArray
        }

        const coordContent = `${number} ${picture} ${pixelCoordinates[0]} ${selectedStarNames[0]} ${pixelCoordinates[1]} ${selectedStarNames[1]} ${pixelCoordinates[2]} ${selectedStarNames[2]}`;
        const lonRange = [-360, 0];
        const latRange = [-90, 90];        

        Plotly.relayout('plot', {
            'geo.lonaxis.range': lonRange,
            'geo.lataxis.range': latRange,
        });

        document.getElementById('constellation-select').value = '';
        pixelOutputOne.textContent = '';
        pixelOutputTwo.textContent = '';
        pixelOutputThree.textContent = '';
        pixelCoordinates = [];
        currentPixel = 0;
        starOutputOne.textContent = '';
        starOutputTwo.textContent = '';
        starOutputThree.textContent = '';
        selectedStars = [];
        document.getElementById('pixel-coordinates').classList.add('hidden');
        sidebar.classList.add('hidden');
        alert('Coordinates saved successfully!');
        
    });

}


    //DELETE SECTION
    function deletingLines() {
        if (selectedLineIndex !== null) {
            Plotly.deleteTraces('plot', selectedLineIndex)
            .then(() => {
                stickFigure.splice(selectedLineIndex -1 , 1); // Adjust index because star trace is at index 0
                constellationLines.splice(selectedLineIndex -1 , 1);
                traceIndices = traceIndices.filter(index => index !== selectedLineIndex);
                for (let i = 0; i <traceIndices.length; i++) {
                    if (traceIndices[i] > selectedLineIndex) {
                        traceIndices[i] --;
                    }
                }
                selectedLineIndex = null;
                previousSelectedLineIndex = null;
                lastPoint = null;
            })
            .catch(function(error) {
                console.error("Error deleting trace:", error);
            });
        } else {
            alert("Please select a line to delete.");
        }
    }

    function undo() {
        var currentTraceCount = document.getElementById('plot').data.length;
        if(currentTraceCount > 0) {
            Plotly.deleteTraces('plot', currentTraceCount-1)
            .then(() => {
                stickFigure.pop(); // Adjust index because star trace is at index 0
                constellationLines.pop();
            }).catch(function(error) {
                console.error("Error deleting trace:", error);
            });
        } else {
            alert("No traces to undo.");
        }
    };

// COMMON NAMES
    function showInput(AddingManual) {
        const container = document.getElementById('manual-input-container');
        const MultiplyInput = document.createElement('div');
        MultiplyInput.className = 'multiply-input';
        MultiplyInput.setAttribute('data-AddingManual', AddingManual);

        if(AddingManual === 'Stars') {
            const objectLabel = document.createElement('label');
            objectLabel.setAttribute('for', 'inputStarManual');
            objectLabel.textContent = 'Star Name:';
            MultiplyInput.appendChild(objectLabel);
            const objectInput = document.createElement('input');
            objectInput.type =  'text';
            objectInput.id = `inputStarManual - ${currentStarInputIndex}`;
            objectInput.placeholder = 'Click the Star or Insert the star Name';
            MultiplyInput.appendChild(objectInput);

            const objectButton = document.createElement('button');
            objectButton.type = 'button';
            objectButton.className = 'verifyStarButton';
            objectButton.textContent = 'Verify';
            const ButtonIcon = document.createElement('span');
            ButtonIcon.className = 'iconify';
            objectButton.appendChild(ButtonIcon);

            objectInput.addEventListener('input', function() {
                ButtonIcon.textContent = '🔍';
            });

            objectButton.addEventListener('click', async () => {
                const thisInput = objectInput.value.trim();
                const result = await getSesameResult(thisInput);
                const searchingfor = /<alias>HIP\s\d+<\/alias>/i;
                if (searchingfor.test(result)) {
                    ButtonIcon.textContent = '✅';
                    const match = result.match(searchingfor);
                    const hipNumber = match[0].replace(/<\/?alias>/g, '').replace('HIP ', '');
                    objectInput.value = `HIP ${hipNumber}`;
                } else if (result.includes("<INFO> *** NNNothing found *** </INFO>")) {
                    ButtonIcon.textContent = '❌';
                    alert("No star found. Please check the name or try again.");
                }
            });
            MultiplyInput.appendChild(objectButton);
            MultiplyInput.appendChild(document.createElement('br'));

            const englishLabel = document.createElement('label');
            englishLabel.setAttribute('for', 'englishInputStarManual');
            englishLabel.textContent = 'English:';
            MultiplyInput.appendChild(englishLabel);
            const englishInput = document.createElement('input');
            englishInput.type = 'text';
            englishInput.id = 'englishInputStarManual';
            englishInput.placeholder = 'Insert the translation of the object name in English';
            MultiplyInput.appendChild(englishInput);
            MultiplyInput.appendChild(document.createElement('br'));

            const nativeLabel = document.createElement('label');
            nativeLabel.setAttribute('for', 'nativeInputStarManual');
            nativeLabel.textContent = 'Native:';
            MultiplyInput.appendChild(nativeLabel);
            const nativeInput = document.createElement('input');
            nativeInput.type = 'text';
            nativeInput.id = 'nativeInputStarManual';
            nativeInput.placeholder = 'Insert the native name or the original written';
            MultiplyInput.appendChild(nativeInput);
            MultiplyInput.appendChild(document.createElement('br'));

            const pronounceLabel = document.createElement('label');
            pronounceLabel.setAttribute('for', 'pronounceInputStarManual');
            pronounceLabel.textContent = 'Pronounce:';
            MultiplyInput.appendChild(pronounceLabel);
            const pronounceInput = document.createElement('input');
            pronounceInput.type = 'text';
            pronounceInput.id = 'pronounceInputStarManual';
            pronounceInput.placeholder = 'Insert how to read the native name';
            MultiplyInput.appendChild(pronounceInput);
            MultiplyInput.appendChild(document.createElement('br'));

        } else if(AddingManual === 'Planet') {

            const objectLabel = document.createElement('label');
            objectLabel.setAttribute('for', 'inputPlanetManual');
            objectLabel.textContent = 'Planet Name:';
            MultiplyInput.appendChild(objectLabel);
            const objectSelect = document.createElement('select');
            objectSelect.id = 'inputPlanetManual';
            const Planets = [
                'Select a planet',
                'Sun',
                'Moon',
                'Mercury',
                'Venus',
                'Earth',
                'Mars',
                'Jupiter',
                'Saturn',
            ];
            Planets.forEach(thePlanet => {
                const option = document.createElement('option');
                option.value = thePlanet;
                option.textContent = thePlanet;
                objectSelect.appendChild(option);
            });
            let planet_name = '';
            objectSelect.addEventListener('change', function() {
                planet_name = objectSelect.value;
            });
            MultiplyInput.appendChild(objectSelect);
            MultiplyInput.appendChild(document.createElement('br'));


            const englishLabel = document.createElement('label');
            englishLabel.setAttribute('for', 'englishInputPlanetManual');
            englishLabel.textContent = 'English:';
            MultiplyInput.appendChild(englishLabel);
            const englishInput = document.createElement('input');
            englishInput.type = 'text';
            englishInput.id = 'englishInputPlanetManual';
            englishInput.placeholder = 'Insert the translation of the object name in English';
            MultiplyInput.appendChild(englishInput);
            MultiplyInput.appendChild(document.createElement('br'));

            const nativeLabel = document.createElement('label');
            nativeLabel.setAttribute('for', 'nativeInputPlanetManual');
            nativeLabel.textContent = 'Native:';
            MultiplyInput.appendChild(nativeLabel);
            const nativeInput = document.createElement('input');
            nativeInput.type = 'text';
            nativeInput.id = 'nativeInputPlanetManual';
            nativeInput.placeholder = 'Insert the native name or the original written';
            MultiplyInput.appendChild(nativeInput);
            MultiplyInput.appendChild(document.createElement('br'));

            const pronounceLabel = document.createElement('label');
            pronounceLabel.setAttribute('for', 'pronounceInputPlanetManual');
            pronounceLabel.textContent = 'Pronounce:';
            MultiplyInput.appendChild(pronounceLabel);
            const pronounceInput = document.createElement('input');
            pronounceInput.type = 'text';
            pronounceInput.id = 'pronounceInputPlanetManual';
            pronounceInput.placeholder = 'Insert how to read the native name';
            MultiplyInput.appendChild(pronounceInput);
            MultiplyInput.appendChild(document.createElement('br'));

            const commentaryLabel = document.createElement('label');
            commentaryLabel.setAttribute('for', 'translatorComment');
            commentaryLabel.textContent = 'Commentary:';
            MultiplyInput.appendChild(commentaryLabel);
            const CommentaryInput = document.createElement('input');
            CommentaryInput.type = 'text';
            CommentaryInput.id = 'translatorComment';
            CommentaryInput.placeholder = 'Insert any comments or notes';
            MultiplyInput.appendChild(CommentaryInput);
            MultiplyInput.appendChild(document.createElement('br'));


        } else if(AddingManual === 'Deep Sky Object') {

            const dsoIndex = currentDSOInputIndex++;

            const objectLabel = document.createElement('label');
            objectLabel.setAttribute('for', 'inputDSOManual');
            objectLabel.textContent = 'Deep Sky Object:';
            MultiplyInput.appendChild(objectLabel);

            const objectInput = document.createElement('input');
            objectInput.type =  'text';
            objectInput.id = `inputDSOManual - ${dsoIndex}`;
            objectInput.placeholder = 'Insert the Deep Sky Object Name';
            MultiplyInput.appendChild(objectInput);

            const objectButton = document.createElement('button');
            objectButton.type = 'button';
            objectButton.className = 'verifyDSOButton';
            objectButton.textContent = 'Verify';

            const ButtonIcon = document.createElement('span');
            ButtonIcon.className = 'iconify';
            objectButton.appendChild(ButtonIcon);

            objectInput.addEventListener('input', function() {
                ButtonIcon.textContent = '🔍';
            });

            objectButton.addEventListener('click', async () => {
                const thisInput = objectInput.value.trim(); 
                const result = await getSesameResult(thisInput);
                if(result.includes("<INFO> *** NNNothing found *** </INFO>")) {
                    ButtonIcon.textContent = '❌';
                } else {
                    ButtonIcon.textContent = '✅';
                }
            });
            MultiplyInput.appendChild(objectButton);
            MultiplyInput.appendChild(document.createElement('br'));

            const englishLabel = document.createElement('label');
            englishLabel.setAttribute('for', 'englishInputDSOManual');
            englishLabel.textContent = 'English:';
            MultiplyInput.appendChild(englishLabel);
            const englishInput = document.createElement('input');
            englishInput.type = 'text';
            englishInput.id = 'englishInputDSOManual';
            englishInput.placeholder = 'Insert the translation of the object name in English';
            MultiplyInput.appendChild(englishInput);
            MultiplyInput.appendChild(document.createElement('br'));

            const nativeLabel = document.createElement('label');
            nativeLabel.setAttribute('for', 'nativeInputDSOManual');
            nativeLabel.textContent = 'Native:';
            MultiplyInput.appendChild(nativeLabel);
            const nativeInput = document.createElement('input');
            nativeInput.type = 'text';
            nativeInput.id = 'nativeInputDSOManual';
            nativeInput.placeholder = 'Insert the native name or the original written';
            MultiplyInput.appendChild(nativeInput);
            MultiplyInput.appendChild(document.createElement('br'));

            const pronounceLabel = document.createElement('label');
            pronounceLabel.setAttribute('for', 'pronounceInputDSOManual');
            pronounceLabel.textContent = 'Pronounce:';
            MultiplyInput.appendChild(pronounceLabel);
            const pronounceInput = document.createElement('input');
            pronounceInput.type = 'text';
            pronounceInput.id = 'pronounceInputDSOManual';
            pronounceInput.placeholder = 'Insert how to read the native name';
            MultiplyInput.appendChild(pronounceInput);
            MultiplyInput.appendChild(document.createElement('br'));

            const commentaryLabel = document.createElement('label');
            commentaryLabel.setAttribute('for', 'translatorComment');
            commentaryLabel.textContent = 'Commentary:';
            MultiplyInput.appendChild(commentaryLabel);
            const CommentaryInput = document.createElement('input');
            CommentaryInput.type = 'text';
            CommentaryInput.id = 'translatorComment';
            CommentaryInput.placeholder = 'Insert any comments';
            MultiplyInput.appendChild(CommentaryInput);
            MultiplyInput.appendChild(document.createElement('br'));

        }
        container.appendChild(MultiplyInput);
        adjustInputWidth();
    }
    function adjustInputWidth() {
        const inserted = document.querySelectorAll('input[type="text"]');
        inserted.forEach(inputWidth => {
            inputWidth.style.width = `${45}ch`;
        });
    }

    async function getSesameResult(inputCNManual) {
        const baseUrl = 'http://cds.unistra.fr/cgi-bin/nph-sesame/-oIfx?';
        const encodedName = encodeURIComponent(inputCNManual);
        try {
            const response = await fetch(`${baseUrl}${encodedName}`, {
                method: 'GET',
                headers: {
                    'Accept': 'text/plain'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.text();
            return data;
        } catch (error) {
            console.error('Fetch error:', error);
            return `Error fetching data: ${error.message}`;
        }
    }

// FINDING
    function findingdesignation(targetLon, targetLat) {
        for (let i = 0; i < window.starData.lon_array.length; i++) {
            if (Math.abs(window.starData.lon_array[i] - targetLon) < 1e-6 && Math.abs(window.starData.lat_array[i] - targetLat) < 1e-6) {
                let designation = window.starData.text_array[i];
                if (!designation || designation === '-') {
                    if (window.starData.catHR_array[i] && window.starData.catHR_array[i] !== '-') {
                        designation = "HR " + window.starData.catHR_array[i];
                    }
                }
                if (!designation || designation === '-') {
                    if (window.starData.catHD_array[i] && window.starData.catHD_array[i] !== '-') {
                        designation = "HD " + window.starData.catHD_array[i];
                    }
                }
                if (!designation || designation === '-') {
                    designation = window.starData.bayername_array[i];
                }
                if (!designation || designation === '-') {
                    return '-';
                }
                return designation;
            }
        }
        return '-';
    }

    function searchStarName(targetLon, targetLat) {
        for (let i = 0; i < window.starData.lon_array.length; i++) {
            if (Math.abs(window.starData.lon_array[i] - targetLon) < 1e-6 && Math.abs(window.starData.lat_array[i] - targetLat) < 1e-6) {
                let name = window.starData.starname_array[i];
                if (!name || name === '-') {
                    name = window.starData.bayername_array[i];
                }
                if (!name || name === '-') {
                    return '-';
                }
                return name;
            }
        }        
        return '-';
    }

    function seacrhboundaryName(targetLon, targetLat) {
        for (let i = 0; i < window.starData.lon_array.length; i++) {
            if (Math.abs(window.starData.lon_array[i] - targetLon) < 1e-6 && Math.abs(window.starData.lat_array[i] - targetLat) < 1e-6) {
                let boundary = window.starData.IAUcat_array[i];                
                if (!boundary ||boundary === '-') {
                    return '-';
                }                
                return boundary;
            }
        }        
        return '-';        
    }

    function findMag(targetLon, targetLat) {
        for (let i = 0; i < window.starData.lon_array.length; i++) {
            if (Math.abs(window.starData.lon_array[i] - targetLon) < 1e-6 && Math.abs(window.starData.lat_array[i] - targetLat) < 1e-6) {
                let magnitude = window.starData.mag_array[i];                
                if (!magnitude || magnitude === '-') {
                    return '-';
                }                
                return magnitude;
            }
        }
        return '-';
    }


// WRAPPER

    //Raycasting method for rirght side
    function stars_inside_hull_normal(polygon, pointWithinHull) {
        const num_vertices = polygon.length;
        const x = pointWithinHull.x;
        const y = pointWithinHull.y;
        let insideR1 = false;

        //-----------------------ROUTINE ONE --------------------------
        //ROUTINE 1 : Read the right side (big HIP number) = Read the original polygon
        let p1 = polygon[0];
        for (let i = 1; i <= num_vertices; i++) {
            p2 = polygon[i % num_vertices];

            if(y > Math.min(p1.y, p2.y)) {
                if(y <= Math.max(p1.y, p2.y)) {
                    if(x <= Math.max(p1.x,p2.x)) {
                        const x_intersection = ((y - p1.y) * (p2.x - p1.x)) / (p2.y - p1.y) + p1.x;

                        if(p1.x === p2.x || x <= x_intersection) {
                            insideR1 = !insideR1;
                        }
                    }
                }
            }
            p1 = p2;
        }
        return insideR1;
    }

    //Raycasting abnormal for left side
    function stars_inside_hull_abnormal(hull, pointWithinHull) {
        const num_vertices = hull.length;
        const x = pointWithinHull.x;
        const y = pointWithinHull.y;
        let insideR2 = false;
        //-----------------------ROUTINE TWO -------------------------------
        let polygonadjusting = hull.map(lekuk => {
            return {x: lekuk.x + 360, y: lekuk.y};
        });
        let p1 = polygonadjusting [0];
        let p2;

        for (let i = 1; i <= num_vertices; i++) {
            p2 = polygonadjusting[i % num_vertices];
    
            if(y > Math.min(p1.y, p2.y)) {
                if(y <= Math.max(p1.y, p2.y)) {
                    if(x <= Math.max(p1.x,p2.x)) {
                        const x_intersection = ((y - p1.y) * (p2.x - p1.x)) / (p2.y - p1.y) + p1.x;

                        if(p1.x === p2.x || x <= x_intersection) {
                            insideR2 = !insideR2;
                        }
                    }
                }
            }
            p1 = p2;
        }
        return insideR2;
    }
    

    //This function is using Graham's scan
    function convexHull(points) {
        const start = points.reduce((lowest,p) => {
            return (p.y < lowest.y || (p.y === lowest.y && p.x < lowest.x)) ? p : lowest;
        });
        points.sort((a,b) => {
            const angleA = Math.atan2(a.y - start.y, a.x - start.x);
            const angleB = Math.atan2(b.y - start.y, b.x - start.x);
            return angleA - angleB;
        });
        const miau = [start];
        for (const p of points) {
            while(miau.length >= 2 && cross(miau[miau.length - 2], miau[miau.length - 1], p) <= 0) {
                miau.pop();
            }
            miau.push(p);
        }
        return miau;
    }
    function cross (o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    //Lets minimize the boundaries of the points
    function isPointInBounds (lon, lat, lonMin, lonMax, latMin, latMax) {
        return lon<lonMax && lon>lonMin && lat<latMax && lat>latMin;
    }

    function getPointsWithinHull (wholePoints, hull) {
        const pointsWithinHull = [];
        const latValues = hull.map(point => point.y);
        const latMin = Math.min(...latValues);
        const latMax = Math.max(...latValues);

        for (let i = 0; i < hull.length; i++) {
            const igo = hull[i];
            let niki = igo.x;

            if(igo.x < -360) {
                niki += 360;

                const lonMin = niki;
                const lonMax = 0;

                const filterPoint = wholePoints.filter(point => 
                    isPointInBounds(point.x, point.y, lonMin, lonMax, latMin, latMax)
                );
                pointsWithinHull.push(...filterPoint);
            } else{
                const lonValues = hull.map(point => point.x);

                const lonMin = Math.min(...lonValues);
                const lonMax = Math.max(...lonValues);

                const filterPoint = wholePoints.filter(point =>
                    isPointInBounds(point.x, point.y, lonMin, lonMax, latMin, latMax)
                );
                pointsWithinHull.push(...filterPoint);
            }
        }

        const uniquePoints = Array.from(new Set(pointsWithinHull.map(JSON.stringify))).map(JSON.parse);
        return uniquePoints;

    }

    function shoelaceArea(thehull) {
        let a = 0;
        for (let i = 0; i < thehull.length; i++) {
            const j = (i+1) % thehull.length;
            a += thehull[i].x * thehull[j].y - thehull[j].x * thehull[i].y;
        }
        return Math.abs(a)/2;
    }
    
    function formatNum(num) {
        return num.toString().padStart(3,'0');
    }
window.initConstellationTools = initConstellationTools;