function initializePlot(lon, lat, text, size, ra, mag) {
    const plotData = {
        type: 'scattergeo',
        lon: lon, //inverse RA
        lat: lat, //Dec
        text: text, //HIP
        marker: {
            size: size,
            color: 'white',
            line: {
                color: 'white',
                width: 1
            }
        },
        hovertemplate: '<b><span style="color: red; font-size:10;"> %{text} </span></b><extra></extra>',
    };

    let currentRotation = {lon: 0, lat: 0};

    const layout = {
        geo: {
            projection: { type: 'mollweide' },
            showland: false,
            showocean: false,
            showlakes: false,
            showrivers: false,
            showcountries: false,
            showcoastlines: false,
            bgcolor: '#0D1130',
            lonaxis: {
                showgrid: true,
                gridcolor: 'white',
                gridwidth: 0.5,
                tick0: -180,
                dtick: 30,
            },
            lataxis: {
                showgrid: true,
                gridcolor: 'white',
                gridwidth: 0.5,
                tick0: -90,
                dtick: 30,
                range: [-90, 90]
            },
        },
        dragmode: 'pan',
        paper_bgcolor: '#0D1130',
        plot_bgcolor: '#0D1130',
        font: { color: 'white' },
        autosize: true,
        margin: { t: 5, b: 5, l: 5, r: 5 } // Minimize margins
    };

    const config = { scrollZoom: true, displaylogo:false, displayModeBar: true };

    Plotly.newPlot('plot', [plotData], layout, config);

    let startY;
    document.getElementById('plot').addEventListener('mousedown', e => {
        startY = e.clientY;
    });

    document.getElementById('plot').addEventListener('mouseup', e => {
        const deltaY = e.clientY - startY;
        const pixelsPerDegree = 4; // Adjust sensitivity (4px ≈ 1°)
      
        // Calculate latitude delta
        const dLat = deltaY / pixelsPerDegree;
        
        // Apply rotation if drag exceeds 45° threshold
        if (Math.abs(dLat) > 45) {
          currentRotation.lat += (dLat > 0 ? 45 : -45); // Rotate in 45° increments
          currentRotation.lat = Math.min(90, Math.max(-90, currentRotation.lat)); // Clamp to [-90°, 90°]
          
          // Update map
          Plotly.relayout('plot', { 'geo.projection.rotation': currentRotation });
        }
    });        
/*
    window.addEventListener('beforeunload', (event) => {
        const confirmationMessage = 'Are you sure you want to leave? Your changes may not be saved.';
        event.returnValue = confirmationMessage; // For most browsers
        return confirmationMessage; // For some browsers
    });
*/
    var plotElement = document.getElementById('plot');
    var lines = [];
    var drawing_enabled = false;
    var stickFigure =[];
    var traceIndices =[]; 
    var constellationLines = [];

    var newstickFigure = []; 
    var newtraceIndices = [];

    let hullTraceIndice = [];

    let selectedLineIndex = null; 
    let previousSelectedLineIndex = null;

    let chosenFolderHandle = null; 
    let saveAsTab = null; 
    let labelTab = null; 
    let avgTab = null; 
    let vertexesTab = null;
    let insideTab = null;
    let coordTab = null;

    let constellationMidpoints = {};

    let folderName = '';
    let fileContents = [];
    
    document.getElementById('openfolder').addEventListener('click', async () => {       
        chosenFolderHandle = await window.showDirectoryPicker();

        if (chosenFolderHandle){
            folderName = chosenFolderHandle.name;
            console.log("Folder selected:", chosenFolderHandle.name);
        } else {
            console.error("Folder selection failed.");
        }

        regionDroplist();
        classificationDroplist();

        const edgesFileHandle = await chosenFolderHandle.getFileHandle('Vertex.fab');
        const edgesFile = await edgesFileHandle.getFile();
        const edgesContents = await edgesFile.text();

        vertexesTab = window.open();
        vertexesTab.document.write('<pre>'+edgesContents+'<pre>');
        vertexesTab.document.title = "Vertex HIP";
        vertexesTab.document.close();

        const contentFileHandle = await chosenFolderHandle.getFileHandle('Inside.fab');
        const contentFile = await contentFileHandle.getFile();
        const contentContents = await contentFile.text();

        insideTab = window.open();
        insideTab.document.write('<pre>'+contentContents+'<pre>');
        insideTab.document.title = "Inside Hull HIP";
        insideTab.document.close();

        const cnstlFileHandle = await chosenFolderHandle.getFileHandle('constellationship.fab');
        const cnstlFile = await cnstlFileHandle.getFile();
        const cnstlContents = await cnstlFile.text();

        saveAsTab = window.open();
        saveAsTab.document.write('<pre>'+cnstlContents+'<pre>');
        saveAsTab.document.title = "Asterisms' HIP";
        saveAsTab.document.close();

        const cnstlLines = cnstlContents.trim().split('\n');
        const formattedcnstlLines = cnstlLines.filter(cnstlline => {
            const cnstlParts = cnstlline.split(' ');
            return cnstlParts.length >= 3;
        });
        const cnstlrowCount = formattedcnstlLines.length;
        SaveAsCount = cnstlrowCount;


        const lines = cnstlContents.trim().split('\n');
        const HIPContents = lines.map(line => {
            const parts = line.split(',');
            const hipNumbers = parts[0].split(' ').slice(2).concat(parts.slice(1));
            return hipNumbers.join(' '); // (2) because, the HIP list is started at the third column. When 1stcolumn is 0.
        }).filter(line => line.length > 0);

        const hipNumbers = HIPContents.map(line => 
            line.split(' ').map(hip => 'HIP ' + hip));

        const numTraces = hipNumbers.length;
        recreateStickFigure(hipNumbers, numTraces);


        const nmFileHandle = await chosenFolderHandle.getFileHandle('constellation_names.fab');
        const nmfile = await nmFileHandle.getFile();
        const nmcontents = await nmfile.text();

        labelTab = window.open();
        labelTab.document.write('<pre>'+nmcontents+'<pre>');
        labelTab.document.title = "Asterisms' Name";
        labelTab.document.close();

        const nmLines = nmcontents.trim().split('\n');
        const formattednmLines = nmLines.filter(nmline => {
            const nmParts = nmline.split(' ');
            return nmParts.length >= 3;
        });
        const nmrowCount = formattednmLines.length;
        LabelCount = nmrowCount;


        const midFileHandle = await chosenFolderHandle.getFileHandle('Mid_point.fab');
        const midfile = await midFileHandle.getFile();
        const midcontents = await midfile.text();

        avgTab = window.open();
        avgTab.document.write('<pre>'+midcontents+'<pre>');
        avgTab.document.title = "Asterisms' Mid";
        avgTab.document.close();

        const midLines = midcontents.trim().split('\n');
        const starData = midLines.map(midline => {
            const midParts = midline.match(/(^\d{3})\s+"([^"]+)"\s+([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)/);
            if (midParts) {
                const starnumber = midParts[1];
                const starName =  midParts[2];
                const firstLon = parseFloat(midParts[3]);
                const firstLat = parseFloat(midParts[4]);
                
                constellationMidpoints[starName] = {firstLon, firstLat, starnumber};
                return {starName, firstLon, firstLat};
            }
            return null;
        }).filter(Boolean);

        updateConstellationOptions();       

        starData.forEach(star => {
            const {starName, firstLon, firstLat} = star;
            const plotData = {
                type: 'scattergeo',
                mode: 'text',
                lon: [firstLon],
                lat: [firstLat],
                text: [starName],
                textposition: "middle center",
                textfont:{
                    color: '#6699e6',
                    size: 15,
                }  
            };
            Plotly.addTraces('plot', plotData).then(() => {
                Plotly.relayout('plot', {
                    'geo.scope': 'mollweide'
                });
            }).catch(function(error) {
                console.error("Error adding text trace:", error);
            });
        });
       
        const artFileHandle = await chosenFolderHandle.getFileHandle('constellationsart.fab');
        const artFile = await artFileHandle.getFile();
        const artContents = await artFile.text();

        coordTab = window.open();
        coordTab.document.write('<pre>'+artContents+'<pre>');
        coordTab.document.title = "Constellation Artwork";
        coordTab.document.close();

    });

    //  REGION DROPLIST
    let regionName = '';
    const regionToCountry = {
        'Northern Africa' : ['Algeria', 'Egypt', 'Libya', 'Morocco', 'Sudan', 'Tunisia', 'Western Sahara'],
        'Eastern Africa' : ['British Indian Ocean Territory', 'Burundi', 'Comoros', 'Djibouti', 'Eritrea', 'Ethiopia', 'French Southern Territories', 'Kenya', 'Madagascar', 'Malawi', 'Mauritius', 'Mayotte', 'Mozambique', 'Réunion', 'Rwanda', 'Seychelles', 'Somalia', 'South Sudan', 'Uganda', 'United Republic of Tanzania', 'Zambia', 'Zimbabwe'],
        'Central Africa' : ['Angola', 'Cameroon', 'Central African Republic', 'Chad', 'Congo', 'Democratic Republic of the Congo', 'Equatorial Guinea', 'Gabon', 'Sao Tome and Principe'],
        'Southern Africa' : ['Botswana', 'Eswatini', 'Lesotho', 'Namibia', 'South Africa'],
        'Western Africa' : ['Benin', 'Burkina Faso', 'Cabo Verde', 'Côte d’Ivoire', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Liberia', 'Mali', 'Mauritania', 'Niger', 'Nigeria', 'Saint Helena', 'Senegal', 'Sierra Leone', 'Togo'],
        'Caribbean' : ['Anguilla', 'Antigua and Barbuda', 'Aruba', 'Bahamas', 'Barbados', 'Bonaire', 'Sint Eustatius and Saba', 'British Virgin Islands', 'Cayman Islands', 'Cuba', 'Curaçao', 'Dominica', 'Dominican Republic', 'Grenada', 'Guadeloupe', 'Haiti', 'Jamaica', 'Martinique', 'Montserrat', 'Puerto Rico', 'Saint Barthélemy', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Martin (French Part)', 'Saint Vincent and the Grenadines', 'Sint Maarten (Dutch part)', 'Trinidad and Tobago', 'Turks and Caicos Islands', 'United States Virgin Islands'],
        'Central America' : ['Belize', 'Costa Rica', 'El Salvador', 'Guatemala', 'Honduras', 'Mexico', 'Nicaragua', 'Panama'],
        'Southern America' : ['Argentina', 'Bolivia (Plurinational State of)', 'Bouvet Island', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Falkland Islands (Malvinas)', 'French Guiana', 'Guyana', 'Paraguay', 'Peru', 'South Georgia and the South Sandwich Islands', 'Suriname', 'Uruguay', 'Venezuela (Bolivarian Republic of)'],
        'Northern America' : ['Bermuda', 'Canada', 'Greenland', 'Saint Pierre and Miquelon', 'United States of America (USA)'],
        'Antarctica' : ['Antarctica'],
        'Northern Asia' : ['Russian Federation (Asian part)'],
        'Central Asia' : ['Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Uzbekistan'],
        'Eastern Asia' : ['China', 'Hong Kong Special Administrative Region of China', 'Macao Special Administrative Region of China', 'Democratic People’s Republic of Korea', 'Japan', 'Mongolia', 'Republic of Korea', 'Taiwan'],
        'South-eastern Asia' : ['Brunei Darussalam', 'Cambodia', 'Indonesia', 'Lao People’s Democratic Republic', 'Malaysia', 'Myanmar', 'Philippines', 'Singapore', 'Thailand', 'Timor-Leste', 'Viet Nam'],
        'Southern Asia' : ['Afghanistan', 'Bangladesh', 'Bhutan', 'India', 'Iran (Islamic Republic of)', 'Maldives', 'Nepal', 'Pakistan', 'Sri Lanka'],
        'Western Asia' : ['Armenia', 'Azerbaijan', 'Bahrain', 'Cyprus', 'Georgia', 'Iraq', 'Israel', 'Jordan', 'Kuwait', 'Lebanon', 'Oman', 'Qatar', 'Saudi Arabia', 'State of Palestine', 'Syrian Arab Republic', 'Türkiye', 'United Arab Emirates', 'Yemen'],
        'Eastern Europe' : ['Belarus', 'Bulgaria', 'Czechia', 'Hungary', 'Poland', 'Republic of Moldova', 'Romania', 'Russian Federation (European part)', 'Slovakia', 'Ukraine'],
        'Northern Europe' : ['Åland Islands', 'Channel Islands', 'Denmark', 'Estonia', 'Faroe Islands', 'Finland', 'Iceland', 'Ireland', 'Isle of Man', 'Latvia', 'Lithuania', 'Norway', 'Svalbard and Jan Mayen Islands', 'Sweden', 'United Kingdom of Great Britain (UK) and Northern Ireland'],
        'Southern Europe' : ['Albania', 'Andorra', 'Bosnia and Herzegovina', 'Croatia', 'Gibraltar', 'Greece', 'Holy See', 'Italy', 'Malta', 'Montenegro', 'North Macedonia', 'Portugal', 'San Marino', 'Serbia', 'Slovenia', 'Spain'],
        'Western Europe' : ['Austria', 'Belgium', 'France', 'Germany', 'Liechtenstein', 'Luxembourg', 'Monaco', 'Netherlands', 'Switzerland'],
        'Australasia' : ['Australia', 'Christmas Island', 'Cocos (Keeling) Islands', 'Heard Island and McDonald  Islands', 'New Zealand', 'Norfolk Island'],
        'Melanesia' : ['Fiji', 'New Caledonia', 'Papua New Guinea', 'Solomon Islands', 'Vanuatu'],
        'Micronesia' : ['Guam', 'Kiribati', 'Marshall Islands', 'Micronesia (Federated States of)', 'Nauru', 'Northern Mariana Islands', 'Palau', 'United States Minor Outlying Islands'],
        'Polynesia' : ['American Samoa', 'Cook Islands', 'French Polynesia', 'Niue', 'Pitcairn', 'Samoa', 'Tokelau', 'Tonga', 'Tuvalu', 'Wallis and Futuna Islands'],
        'World' : ['Modern'],
    }
    const countryinRegion = {};
    for (const region in regionToCountry) {
        regionToCountry[region].forEach(country => {
            countryinRegion[country] = region;
        });
    }
    const regionsyoucansee = Object.keys(regionToCountry);
    function regionDroplist() {
        const regions = [
            'Northern Africa',
            'Eastern Africa',
            'Central Africa',
            'Southern Africa',
            'Western Africa',
            'Caribbean',
            'Central America',
            'Southern America',
            'Northern America',
            'Antarctica',
            'Northern Asia',
            'Central Asia',
            'Eastern Asia',
            'South-eastern Asia',
            'Southern Asia',
            'Western Asia',
            'Eastern Europe',
            'Northern Europe',
            'Southern Europe',
            'Western Europe',
            'Australasia',
            'Melanesia',
            'Micronesia',
            'Polynesia',
            'World'
        ];
        const regionDropMenu = document.getElementById('regionDropdown');
        regionDropMenu.innerHTML = ''; // Clear previous options

        regions.forEach(region => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'dropdown-option';
            optionDiv.textContent = region;
            optionDiv.addEventListener('click', function() {
                regionName = region;
                document.getElementById('regionSearch').value = region;
                regionDropMenu.innerHTML = '';
                regionDropMenu.style.display = 'none';
            });
            regionDropMenu.appendChild(optionDiv);
        });
        regionDropMenu.style.display = 'block';
        document.getElementById('regionSearch').style.display = 'block'; 
        document.getElementById('regionSearch').addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            regionDropMenu.innerHTML = ''; 
            const options = regionDropMenu.children;
            let hasVisibleOptions = false;
            const addedRegions = new Set(); // Track added regions to avoid duplicates

            for (const country in countryinRegion) {
                if(country.toLowerCase().includes(searchTerm)) {
                    const theRegion = countryinRegion[country];
                    if(!addedRegions.has(theRegion)) {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'dropdown-option';
                        optionDiv.textContent = theRegion;
                        optionDiv.addEventListener('click', function() {
                            regionName = theRegion;
                            document.getElementById('regionSearch').value = theRegion;
                            regionDropMenu.innerHTML = '';
                            regionDropMenu.style.display = 'none';
                        });
                        regionDropMenu.appendChild(optionDiv);
                        hasVisibleOptions = true;
                        addedRegions.add(theRegion);
                    }    
                }
            }
            regionsyoucansee.forEach(region => {
                if (region.toLowerCase().includes(searchTerm) && !addedRegions.has(region)) { // Check if the region is already added
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'dropdown-option';
                    optionDiv.textContent = region;
                    optionDiv.addEventListener('click', function() {
                        regionName = region;
                        document.getElementById('regionSearch').value = region;
                        regionDropMenu.innerHTML = '';
                        regionDropMenu.style.display = 'none';
                    });
                    regionDropMenu.appendChild(optionDiv);
                    hasVisibleOptions = true;
                }
            });

            regionDropMenu.style.display = hasVisibleOptions ? 'block' : 'none';
        });

        document.getElementById('regionSearch').addEventListener('focus', function() {
            regionDropMenu.style.display = 'block';
        });
        document.addEventListener('click', function(event) {
            if (!regionDropMenu.contains(event.target) && event.target !== document.getElementById('regionSearch')) {
                regionDropMenu.style.display = 'none'; 
            }
        });
    }
    
    // CLASSIFICATION DROPLIST
    let classificationName = '';

    function classificationDroplist() {
        const classifications = [
            {name: 'Select a classification', info: ''},
            {name: 'Personal', info: 'This is a personally developed sky culture which is not founded in published historical or ethnological research. Stellarium may include it when it is “pretty enough” without really approving its contents.'},
            {name: 'Traditional', info: '(default value) Content represents “common” knowledge by several members of an ethnic community, and the sky culture has been developed by members of such community. Our “Modern” sky culture is a key example: rooted in antiquity it has evolved for about 2500 years in what is now commonly known as “western” world, and modern astronomers use it.'},
            {name: 'Ethnographic', info: 'Provided by ethnographic researchers based on interviews of indigenous people.'},
            {name: 'Historical', info: 'Based on historical written sources from a (usually short) period of the past.'},
            {name: 'Single', info: 'Represents a single source like a historical atlas, or related publications of a single author.'},
            {name: 'Comparative', info: 'Special-purpose compositions of e.g. artwork from one and stick figures from another sky culture, and optionally asterisms as representations of a third. Or comparison of two stick figure sets in constellations and asterisms. These figures sometimes will appear not to fit together well. This may be intended, to explain and highlight just those differences! The description text must clearly explain and identify all sources and how these differences should be interpreted.'},
        ];
        const classificationDropMenu = document.getElementById('classificationDropdown');
        classificationDropMenu.innerHTML = '';
        classifications.forEach(classification => {
            const optionClassification = document.createElement('option');
            optionClassification.value = classification.name;
            optionClassification.textContent = classification.name;
            optionClassification.title = classification.info;
            classificationDropMenu.appendChild(optionClassification);
        });
        classificationDropMenu.style.display = 'block';
        classificationDropMenu.addEventListener('change', function() {
            classificationName = this.value.trim();
        });
    }

    function recreateStickFigure(hipNumbers, numTraces){

        for (let i = 0; i < numTraces; i++) {
            const points = hipNumbers[i].map(hip => {
                    const pointIndex = text.findIndex((text,i) => text === hip);
                    if (pointIndex === -1) {
                        console.error(`Error: unable to find HIP number ${hip} in data`);
                        return null;
                    }
                    return {x:lon[pointIndex] , y:lat[pointIndex]};
                }).filter(point => point !== null) ;

                if (points.length === 0) {
                    console.error(`Error: no points found for line ${index}`);
                    return;
                }

                // Create line traces in pairs
                for (let j = 0; j < points.length; j += 2) {
                    if(j+1 < points.length) {
                        const deltaLon = points[j+1].x - points[j].x;
                        const deltaLat = points[j+1].y - points[j].y;
                        const distance = Math.sqrt(deltaLon * deltaLon + deltaLat * deltaLat);
                        const offsetFactor = 0.02;

                        const lonOffset = (deltaLon/distance) * offsetFactor;
                        const latOffset = (deltaLat/distance) * offsetFactor;
        
                        const lineTrace = {
                            type: 'scattergeo',
                            mode: 'lines',
                            lon: [points[j].x + lonOffset, points[j + 1].x - lonOffset], // Connect point(j) and point (j+1)
                            lat: [points[j].y + latOffset, points[j + 1].y - latOffset], 
                            line: {
                                color:'#333399',
                                width:2,
                                opacity:0.5,
                            },
                        };
                    
                    Plotly.addTraces('plot', lineTrace).then(additionResult => {
                        newtraceIndices.push(additionResult);
                        newstickFigure.push([points[j], points[j+1]]);
                    });
                    }
                }
            
        };
        newstickFigure = [];
        newtraceIndices =[];
    } stickFigure = [];

    document.getElementById('draw').addEventListener('click',function() {
        drawing_enabled = !drawing_enabled;
        var mode= drawing_enabled ? 'enabled' : 'disabled';
        console.log(`Drawing mode ${mode}`);
        if (drawing_enabled) {
            document.getElementById('draw').children[0].src = 'icon/pencilactive.png'
        } else {
            document.getElementById('draw').children[0].src = 'icon/pencil.png'
        }
    });

    let selectedStars = [];
    let selectedStarNames = [];
    let editModeStar = null;
    const starOutputOne = document.getElementById('star-1');
    const starOutputTwo = document.getElementById('star-2');
    const starOutputThree = document.getElementById('star-3');
    const editStarOne = document.getElementById('editstar-1');
    const editStarTwo = document.getElementById('editstar-2');
    const editStarThree = document.getElementById('editstar-3');


    let lastPoint = null;
    
    plotElement.on('plotly_click', function(data){
        var point = data.points[0];

        const CNcontainer = document.getElementById('add-dso');
        if(CNcontainer.style.display === 'block') {
            if(point.curveNumber === 0 && starInputModeActive) {
                const selectedStarCN = {lon:point.lon, lat:point.lat};
                const selectedStarCNName = text.find((hip, i) => {
                    const lon = lon_array[i];
                    const lat = lat_array[i];
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
                console.log("Updated cstars:", selectedStars);

                selectedStarNames = selectedStars.map(point => {
                    return text.find((hip, i) => {
                        const lon = lon_array[i];
                        const lat = lat_array[i];
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
            console.log("Stored coordinates:", selectedStars);

            selectedStarNames = selectedStars.map(point => {
                return text.find((hip, i) => {
                    const lon = lon_array[i];
                    const lat = lat_array[i];
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
                            width:5,
                            opacity:0.5
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
                var latValue = lat[point.pointIndex];
                var raValue = ra[point.pointIndex];
                var magValue = mag[point.pointIndex];
                modalContent.innerHTML = `<div class="pop-up"><span class="close">&times;</span><p>Clicked on: ${point.text}</p><p>Dec: ${latValue}</p><p>RA: ${raValue}</p><p>Mag: ${magValue}</p></div>`;
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
                    console.log("Starting new line from:", lastPoint);
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


    window.onresize = function() {
    Plotly.relayout('plot', {
        width: window.innerWidth,
        height: window.innerHeight
    });
    };

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
            })
            .catch(function(error) {
                console.error("Error deleting trace:", error);
            });
        } else {
            alert("Please select a line to delete.");
        }
    }
    document.getElementById('delete').addEventListener('click', deletingLines);
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Delete') {
            deletingLines();
        }
    });

    function undo() {
        var currentTraceCount = document.getElementById('plot').data.length;
        console.log("currentTraceCount", currentTraceCount);
        if(currentTraceCount > 0) {
            Plotly.deleteTraces('plot', currentTraceCount-1)
            .then(() => {
                stickFigure.pop(); // Adjust index because star trace is at index 0
                constellationLines.pop();
                console.log(`Deleted trace at index:, ${currentTraceCount -1}`);
            }).catch(function(error) {
                console.error("Error deleting trace:", error);
            });
        } else {
            alert("No traces to undo.");
        }
    };
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();
            undo();
        }
    });
    
//  COMMON_NAMES SECTION
    document.getElementById('commonName').addEventListener('click', function() {
        document.getElementById('add-dso').style.display= 'block';
    });
    document.getElementById('cancel-commonName').addEventListener('click', function(){
        document.getElementById('add-dso').style.display = 'none';
        const container = document.getElementById('manual-input-container');
        container.innerHTML = '';

    });
    let starInputModeActive = false;
    let currentStarInputIndex = 0;
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
    let currentDSOInputIndex = 0;
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

            const ReferencesLabel = document.createElement('label');
            ReferencesLabel.setAttribute('for', 'referenceInputStarManual');
            ReferencesLabel.textContent = 'Reference:';
            MultiplyInput.appendChild(ReferencesLabel);
            const ReferencesInput = document.createElement('input');
            ReferencesInput.type = 'text';
            ReferencesInput.id = 'referenceInputStarManual';
            ReferencesInput.placeholder = 'Insert the Reference';
            MultiplyInput.appendChild(ReferencesInput);
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

            const ReferencesLabel = document.createElement('label');
            ReferencesLabel.setAttribute('for', 'referenceInputPlanetManual');
            ReferencesLabel.textContent = 'Reference:';
            MultiplyInput.appendChild(ReferencesLabel);
            const ReferencesInput = document.createElement('input');
            ReferencesInput.type = 'text';
            ReferencesInput.id = 'referenceInputPlanetManual';
            ReferencesInput.placeholder = 'Insert the Reference';
            MultiplyInput.appendChild(ReferencesInput);
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

            const ReferencesLabel = document.createElement('label');
            ReferencesLabel.setAttribute('for', 'referenceInputDSOManual');
            ReferencesLabel.textContent = 'Reference:';
            MultiplyInput.appendChild(ReferencesLabel);
            const ReferencesInput = document.createElement('input');
            ReferencesInput.type = 'text';
            ReferencesInput.id = 'referenceInputDSOManual';
            ReferencesInput.placeholder = 'Insert the Reference';
            MultiplyInput.appendChild(ReferencesInput);
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



    const commonNames = {};

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
                const References = objectInput[4].value.trim(); 

                commonNames[AddObject] = [{
                    english: EnglishObject,
                    native: NativeObject,
                    pronounce: PronounceObject,
                    references: References
                }];
            }
            else if(AddingManual === 'Planet') {
                const AddObject = objectSelect.value.trim();
                const EnglishObject = objectInput[0].value.trim();
                const NativeObject = objectInput[1].value.trim();
                const PronounceObject = objectInput[2].value.trim(); 
                const Commentary = objectInput[3].value.trim(); 
                const References = objectInput[4].value.trim();

                commonNames[`NAME ${AddObject}`] = [{
                    english: EnglishObject,
                    native: NativeObject,
                    pronounce: PronounceObject,
                    translators_comments: Commentary,
                    references: References
                }];
            } else if(AddingManual === 'Deep Sky Object') {
                const AddObject = objectInput[0].value.trim();
                const EnglishObject = objectInput[1].value.trim();
                const NativeObject = objectInput[2].value.trim();
                const PronounceObject = objectInput[3].value.trim(); 
                const Commentary = objectInput[4].value.trim(); 
                const References = objectInput[5].value.trim();

                commonNames[AddObject] = [{
                    english: EnglishObject,
                    native: NativeObject,
                    pronounce: PronounceObject,
                    translators_comments: Commentary,
                    references: References
                }];
            }
        })
        document.getElementById('add-dso').style.display = 'none';
        starInputModeActive = false;
        const container = document.getElementById('manual-input-container');
        container.innerHTML = '';
    });


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
    

    //This function is using Andrew's monotone chain algorithm
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
    
    function formatNum(num) {
        return num.toString().padStart(3,'0');
    }

    
    let LabelCount = 0;
    let constellationLabels = {};
    let labelTranslated, labelNative, labelPronounce, labelIPA;
    let translations = {};
    let natives = {};
    let pronounces = {};
    let IPAs = {};
    let LabelNames = [];

    document.getElementById('cancel-label').addEventListener('click', function(){
        document.getElementById('label-input').style.display = 'none';
    });
    document.getElementById('label').addEventListener('click', function(){
        if (stickFigure.length === 0 || stickFigure.every(line => line.length === 0)) {
            alert("No points available for labeling. Please draw some lines first.");
            return;
        }
        document.getElementById('label-input').style.display = 'block';
        function adjustInput(inputWidth) {
            const placeholder = inputWidth.getAttribute('placeholder').length;
            inputWidth.style.width = `${placeholder+1}ch`;
        }
        const inputs = document.querySelectorAll('input[type="text"]');
        inputs.forEach(adjustInput);
    });

    document.getElementById('save-label').addEventListener('click', function(){

        labelTranslated = document.getElementById('english').value.trim();
        labelNative = document.getElementById('native').value.trim();
        labelPronounce = document.getElementById('pronounce').value.trim();
        labelIPA = document.getElementById('ipa').value.trim();

        console.log("Label2:", {labelTranslated, labelNative, labelPronounce});
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
        if(labelTranslated === '' || labelNative === '' ) {
            alert("Please fill in all fields.");
            return;
        }
        const labelnumber = `${formatNum(++LabelCount)}`;
        const labelContent = `${labelnumber} "english": "${labelTranslated}", "native": "${labelNative}", "pronounce": "${labelPronounce}", "ipa": "${labelIPA}"`;

        if(labelTranslated && labelTranslated.trim() !== '') {
            LabelNames.push({labelTranslated, labelNative, labelPronounce, labelIPA});
        }

        if (labelNative && labelNative.trim() !== '') {

            if (!labelTab) {
                labelTab = window.open();
//                labelTab.document.write('<pre>' + labelContent + '</pre>');
//                labelTab.document.title = "Asterisms' Name";
                labelTab.document.write(`
                    <html>
                        <head>
                            <title>Asterisms' Name</title>
                        </head>
                        <body>
                            <pre>${labelContent}</pre>
                            <script>
                                window.addEventListener('beforeunload', (event) => {
                                    const confirmationMessage = 'Are you sure you want to leave? Your changes may not be saved.';
                                    event.returnValue = confirmationMessage; // For most browsers
                                    return confirmationMessage; // For some browsers
                                });
                            <\/script>
                        </body>
                    </html>
                    `);
                labelTab.document.close();
            } else {
                labelTab.document.querySelector('pre').innerHTML += '\n' + labelContent;//labelTab.document.body.innerHTML +='<pre>' + labelContent + '</pre>'; 
            }

            let sumLon = 0;
            let sumLat = 0;
            let count = 0;

            // Calculate Max Min Coordinates
            let Real_DEmax, Real_DEmin, Real_RAmax, Real_RAmin;
            if(stickFigure.length > 0) {
                Real_DEmax = Math.max(...stickFigure.map(line => Math.max(...line.map(point => point.y))));
                Real_DEmin = Math.min(...stickFigure.map(line => Math.min(...line.map(point => point.y))));
                Real_RAmax = Math.max(...stickFigure.map(line => Math.max(...line.map(point => point.x))));
                Real_RAmin = Math.min(...stickFigure.map(line => Math.min(...line.map(point => point.x))));
            }
            console.log("Data", {Real_DEmax, Real_DEmin, Real_RAmax, Real_RAmin});

            //Start midpoint
            let minLon = Infinity;
            let maxLon = - Infinity;

            for(let i = 0; i < stickFigure.length; i++) {
                for (let j = 0; j < stickFigure[i].length; j++) {
                    const lon = stickFigure[i][j].x;
                    minLon = Math.min(minLon, lon);
                    maxLon = Math.max(maxLon, lon);
                }
            }
            if (maxLon<=0 && minLon>= -360){
                const lonDiff = minLon - maxLon;
                for(let i = 0; i < stickFigure.length; i++) {
                    for (let j = 0; j < stickFigure[i].length; j++) {
                        let lon = stickFigure[i][j].x;
                        if(lonDiff<-180 && lon>-180){
                            lon += -360;
                        }
                        sumLon += lon;
                        sumLat += stickFigure[i][j].y;
                        count ++;
                    }
                }
                if (count > 0) {
                    let avgLon = sumLon / count;
                    const avgLat = sumLat / count;
                    if (avgLon <-360) {
                        avgLon +=360;
                    }
                    if (avgLon >= -360 && avgLon <= 0 && avgLat >= -90 && avgLat <= 90) {
                        const plotData = {
                            type:'scattergeo',
                            mode: 'text',
                            lon: [avgLon],
                            lat: [avgLat],
                            text: [labelNative],
                            textposition: "middle center",
                            textfont: {
                                color: '#6699e6',
                                size: 25,
                            }
                        };
                        Plotly.addTraces('plot', plotData).then(() => {
                            Plotly.relayout('plot',{
                                'geo.scope': 'mollweide'
                            });
                        }).catch(function (error) {
                            console.error("Error adding text trace:", error);
                        });

                        const avgContent = `${labelnumber} "${labelNative}" ${avgLon} ${avgLat} DEmax: ${Real_DEmax} DEmin: ${Real_DEmin} RAmax: ${Real_RAmax} RAmin: ${Real_RAmin}`;
                        constellationLabels[labelNative] = {avgLon,avgLat,labelnumber};
                        if (!avgTab) {
                            avgTab = window.open();
                            avgTab.document.write(`
                                <html>
                                    <head>
                                        <title>Asterisms' Mid</title>
                                    </head>
                                    <body>
                                        <pre>${avgContent}</pre>
                                        <script>
                                            window.addEventListener('beforeunload', (event) => {
                                                const confirmationMessage = 'Are you sure you want to leave? Your changes may not be saved.';
                                                event.returnValue = confirmationMessage; // For most browsers
                                                return confirmationMessage; // For some browsers
                                            });
                                        <\/script>
                                    </body>
                                </html>
                                `);
            
//                            avgTab.document.write('<pre>' + avgContent + '</pre>');
//                            avgTab.document.title = "Asterisms' Mid";
                            avgTab.document.close();    
                        } else {
                            avgTab.document.querySelector('pre').innerHTML += '\n' + avgContent;//avgTab.document.body.innerHTML += '<pre>' + avgContent + '</pre>';
                        }
                        updateConstellationOptions();
                        console.log("Constellation Labels:", constellationLabels);
                        
                    } else {
                        alert("The calculated label position is out of bounds.");
                    }
                }else {
                    alert("No points available for labeling.");
                }    
            } else {
                alert ("The longitude values are out of expected bounds: maxLon should be <= 0 and minLon should be >= -360")
            }
        }
        document.getElementById('english').value = '';
        document.getElementById('native').value = '';
        document.getElementById('pronounce').value = '';
        document.getElementById('ipa').value = '';
        document.getElementById('label-input').style.display = 'none';
    });


    let SaveAsCount = 0;
    const constellationsList = [];
    let nomor = 0;
    
    document.getElementById('save-as').addEventListener('click', function(){
        if(stickFigure.length === 0) return;

        nomor = `${formatNum(++SaveAsCount)}`;

        const modi = JSON.parse(JSON.stringify(stickFigure));
        console.log("FIRST modi", modi);
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
            console.log("SECOND modi", modi);
        }
//Batasnya
        const allPoints = modi.flat(); 
        console.log("allPoints", allPoints);
        const hull = convexHull(allPoints);
        console.log("hull", hull);
        const polygon = hull;
        const vertexHIPs = [];
        
        for (let i = 0; i < hull.length; i++) {
            const vertexPoint = hull[i];
            let adjustedLongitude = vertexPoint.x;
            if (vertexPoint.x < -360) {
                adjustedLongitude += 360;
            }
            const hip = text.find((hip, index) => {
                return Math.abs(lon[index] - adjustedLongitude) < 1e-6 && Math.abs(lat[index] - vertexPoint.y) < 1e-6;
            });
            if (hip) {
                vertexHIPs.push(hip.trim());
            }            
        }

        const vertexesContent = `${nomor} ${vertexHIPs.length} ${vertexHIPs}`;

        if(!vertexesTab) {
            vertexesTab = window.open();
            vertexesTab.document.write(`
                <html>
                    <head>
                        <title>Vertexes HIP</title>
                    </head>
                    <body>
                        <pre>${vertexesContent}</pre>
                        <script>
                            window.addEventListener('beforeunload', (event) => {
                                const confirmationMessage = 'Are you sure you want to leave? Your changes may not be saved.';
                                event.returnValue = confirmationMessage; // For most browsers
                                return confirmationMessage; // For some browsers
                            });
                        <\/script>
                    </body>
                </html>
                `);
//            vertexesTab.document.write('<pre>' + vertexesContent + '</pre>');
//            vertexesTab.document.title = 'Vertexes HIP';
            vertexesTab.document.close();
        } else {
            vertexesTab.document.querySelector('pre').innerHTML += '\n' + vertexesContent;//vertexesTab.document.body.innerHTML +='<pre>' + vertexesContent + '</pre>';
        }

        //wholePoints is the data from csv
        const wholePoints = lon.map((lon,index) => {
            return {x:lon, y:lat[index]};
        });
        const pointsWithinHull = getPointsWithinHull(wholePoints,hull);

        const pointsInsideHull = [];

        //Find the point from sub-catalog inside the convexhull
        pointsWithinHull.forEach(pointWithinHull => {
            const isInside = stars_inside_hull_normal(polygon,pointWithinHull);
            if(isInside) {
                console.log(`The point (${pointWithinHull.x}, ${pointWithinHull.y}) is inside the polygon.`);
                pointsInsideHull.push(pointWithinHull);
            } else {
                console.log(`The point (${pointWithinHull.x}, ${pointWithinHull.y}) is outside the polygon.`);
            }
        });

        const starsInsideHull = [];

        // Find the second routine
        pointsWithinHull.forEach(mirror => {
            const isInside2 = stars_inside_hull_abnormal(hull,mirror);
            if(isInside2) {
                console.log(`The point (${mirror.x}, ${mirror.y}) is inside the polygon.`);
                starsInsideHull.push(mirror);
            } else {
                console.log(`The point (${mirror.x}, ${mirror.y}) is inside the polygon.`)
            }
        });
      
        const insideHIPs = [];
        
        for (let i = 0; i < pointsInsideHull.length; i++) {
            const insidePoint = pointsInsideHull[i];
            const hip = text.find((hip, index) => {
                return Math.abs(lon[index] - insidePoint.x) < 1e-6 && Math.abs(lat[index] - insidePoint.y) < 1e-6;
            });
            if (hip) {
                insideHIPs.push(hip.trim());
            }

        }

        const insidemirror = [];
        
        for (let i = 0; i < starsInsideHull.length; i++) {
            const insidePoint = starsInsideHull[i];
            const hip = text.find((hip, index) => {
                return Math.abs(lon[index] - insidePoint.x) < 1e-6 && Math.abs(lat[index] - insidePoint.y) < 1e-6;
            });
            if (hip) {
                insidemirror.push(hip.trim());
            }
        }
        if(insidemirror.length > 0 && insideHIPs.length > 0) {
            insidemirror[0] = ','+insidemirror[0];
        } else {
            insidemirror[0];
        }

        const totalstars = insideHIPs.length + insidemirror.length;
        const insideContent = `${nomor} ${totalstars} ${insideHIPs}${insidemirror}`;

        if(!insideTab) {
            insideTab = window.open();
            insideTab.document.write(`
                <html>
                    <head>
                        <title>Inside Hull</title>
                    </head>
                    <body>
                        <pre>${insideContent}</pre>
                        <script>
                            window.addEventListener('beforeunload', (event) => {
                                const confirmationMessage = 'Are you sure you want to leave? Your changes may not be saved.';
                                event.returnValue = confirmationMessage; // For most browsers
                                return confirmationMessage; // For some browsers
                            });
                        <\/script>
                    </body>
                </html>
                `);
//            insideTab.document.write('<pre>' + insideContent + '</pre>');
//            insideTab.document.title = 'Inside Hull HIP';
            insideTab.document.close();
        } else {
            insideTab.document.querySelector('pre').innerHTML += '\n' + insideContent;//insideTab.document.body.innerHTML +='<pre>' + insideContent + '</pre>';
        }
        console.log("stickFigure", stickFigure);
        
        fileContents = constellationLines.map((line,index) => {
            const hips = new Set(line.map(point => {
                return text.find((hip, i) => {
                    const lon = lon_array[i];
                    const lat = lat_array[i];
                    return Math.abs(lon - point.x) < 1e-6 && Math.abs(lat - point.y) < 1e-6;
                });
            }).filter(Boolean));
            return [... hips].map(hip => {
                const number = parseInt(hip.replace('HIP', '').trim(), 10);
                return isNaN(number)? null: number;
            }).filter(num => num !== null);
        }).flat();

//            return [...hips].map(hip=>hip.replace('HIP','').trim()).join(', ').trim(); //Remove the term "HIP"
//        }).join(', ');

        const saveAsContent = `${nomor} ${stickFigure.length} ${fileContents}`;
        if (!saveAsTab) {
            saveAsTab = window.open();
            saveAsTab.document.write(`
                <html>
                    <head>
                        <title>Asterisms' HIP</title>
                    </head>
                    <body>
                        <pre>${saveAsContent}</pre>
                        <script>
                            window.addEventListener('beforeunload', (event) => {
                                const confirmationMessage = 'Are you sure you want to leave? Your changes may not be saved.';
                                event.returnValue = confirmationMessage; // For most browsers
                                return confirmationMessage; // For some browsers
                            });
                        <\/script>
                    </body>
                </html>
                `);
//            saveAsTab.document.write('<pre>' + saveAsContent + '</pre>');
//            saveAsTab.document.title = "Asterisms' HIP";
            saveAsTab.document.close();
        } else {
            saveAsTab.document.querySelector('pre').innerHTML += '\n' + saveAsContent;//saveAsTab.document.body.innerHTML +='<pre>' + saveAsContent + '</pre>';
        }       

        const constellation = {
            id: `CON ${folderName} ${nomor}`,
            lines: fileContents,
            common_name: {
                english: labelTranslated,
                native: labelNative,
                pronounce: labelPronounce,
                ipa: labelIPA
            }
        };
        constellationsList.push(constellation);
        stickFigure = [];
        constellationLines = [];
        lastPoint = null;
    });



    function download_JSON_Format() {
        // Structure of JSON output
        const index_JSON = {
            id: folderName,
            region: regionName,
            classification: classificationName,
            fallback_to_international_names: false,
            constellations: constellationsList,
            common_names: commonNames,
        };

        let jsonstring = JSON.stringify(index_JSON,null,2);
        jsonstring = jsonstring.replace(/"lines":\s*"(\[.*?\])"/g, (match, p1) => {
            const unescape = p1.replace(/\\"/g, '"');
            return `"lines": ${unescape}`;
        });
        const blob = new Blob([jsonstring], {type: 'application/json'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'index.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    document.getElementById('submit').addEventListener('click', async () => {
        if (!chosenFolderHandle) {
            alert("Please select a folder first using the 'Open Folder' button.");
            return;
        }
        try{
            download_JSON_Format();
            
            // Create a file handle for the list of HIP file
            const listFileHandle = await chosenFolderHandle.getFileHandle('constellationship.fab', { create: true });
            // Create a writable stream for the list of HIP file
            const listStream = await listFileHandle.createWritable();
            // Write the file contents to the list of HIP file
            await listStream.write(saveAsTab.document.body.innerText);
            await listStream.close();

            const vertexFileHandle = await chosenFolderHandle.getFileHandle('Vertex.fab', {create:true});
            const vertexStream = await vertexFileHandle.createWritable();
            await vertexStream.write(vertexesTab.document.body.innerText);
            await vertexStream.close();

            const insideFileHandle = await chosenFolderHandle.getFileHandle('Inside.fab', {create:true});
            const insideStream = await insideFileHandle.createWritable();
            await insideStream.write(insideTab.document.body.innerText);
            await insideStream.close();

            const labelFileHandle = await chosenFolderHandle.getFileHandle('constellation_names.fab', { create: true });
            const labelStream = await labelFileHandle.createWritable();
            await labelStream.write(labelTab.document.body.innerText);
            await labelStream.close();
            
            const avgFileHandle = await chosenFolderHandle.getFileHandle('Mid_point.fab', {create:true});
            const avgStream = await avgFileHandle.createWritable();
            await avgStream.write(avgTab.document.body.innerText);
            await avgStream.close();

            const coordFileHandle = await chosenFolderHandle.getFileHandle('constellationsart', {create:true});
            const coordStream = await coordFileHandle.createWritable();
            await coordStream.write(coordTab.document.body.innerText);
            await coordStream.close();
            

            }
         catch (error) {
            console.error("Error saving files:", error);
            alert("Failed to save files. Please try again.");
        }
    });

    let n; //Number of convex polygon

    function displayEdges(HIPedgesNumbers, edgesTraces){
        n = edgesTraces;
        for (let i = 0; i < edgesTraces; i++) {
            const points = HIPedgesNumbers[i].map(hip => {
                    const pointIndex = text.findIndex((text,i) => text === hip);
                    if (pointIndex === -1) {
                        console.error(`Error: unable to find HIP number ${hip} in data`);
                        return null;
                    }
                    return {x:lon[pointIndex] , y:lat[pointIndex]};
                }).filter(point => point !== null) ;

                if (points.length === 0) {
                    console.error(`Error: no points found for line ${index}`);
                    return;
                }
                points.push(points[0]);

                const hullTrace = {
                    type: 'scattergeo',
                    mode: 'lines',
                    lon: points.map(point => point.x),
                    lat: points.map(point => point.y),
                    line: {
                        color:'orange',
                        width:2,
                        dash:'dash',
                        opacity:0.5,
                    },
                };
            
            Plotly.addTraces('plot', hullTrace).then((result) => {
                if(Array.isArray(result) && result.length > 0) {
                    hullTraceIndice.push(result[0]);
                } 
                convexFigure.push(points);
            }).catch((error) => {
                console.error("Error adding trace:", error);
            });
            
        };
    };

    function deleteEdges(n) {
        var currentTraces = document.getElementById('plot').data;
        var totalTraces = currentTraces.length;
        if(totalTraces >= n) {
            var indiceToDelete = Array.from({ length:n}, (_,i) => totalTraces - n + i);
            Plotly.deleteTraces('plot', indiceToDelete).then(() => {

                var remainingTraces = document.getElementById('plot').data;
            });
        } else {
            console.log("Not enough traces to delete.");
        }
    };

    var wrapping_enabled = false;
    var convexFigure = [];

    document.getElementById('convex').addEventListener('click', async() => {
        wrapping_enabled = !wrapping_enabled;
        var mode= wrapping_enabled ? 'enabled' : 'disabled';
        console.log(`Wrapping mode ${mode}`);
        updateButtons();
        if(wrapping_enabled) {
            if(vertexesTab && !vertexesTab.closed) {
                const vertexesContents = vertexesTab.document.body.innerText;
                const readVertexesLines = vertexesContents.trim().split('\n');
                const HIPvertexesContent = readVertexesLines.map(line => {
                    const part = line.split(' ');
                    return part.slice(2).join(' ');
                }).filter(line => line.length > 0);
                const HIPvertexesNumbers = HIPvertexesContent.map(line =>
                    line.split(',').map(hip => hip));
                HIPedgesNumbers = HIPvertexesNumbers;
                const edgesTraces = HIPedgesNumbers.length;
                displayEdges(HIPedgesNumbers,edgesTraces);
            }           
            console.log("Wrap mode is enabled.");
        } else {
            console.log("Wrap mode is disabled.");
            if(n>0) {
                deleteEdges(n);
            } else {
                alert("Please enter a positive integer.");
            }
        }
    });

    const modeButton = document.querySelectorAll('.modeButton');
    function updateButtons() {
        modeButton.forEach(button => {
            if(wrapping_enabled) {
                button.classList.add('disabled');
                button.disabled = true;
            } else {
                button.classList.remove('disabled');
                button.disabled = false;
            }
        });
    }

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

    document.getElementById('image').addEventListener('click', () => {
        document.getElementById('image-upload').click();
        sidebar.classList.remove('hidden');
        document.getElementById('first-sidebar-container').classList.remove('hidden');
        document.getElementById('second-sidebar-container').classList.add('hidden');       
    });

    document.addEventListener('DOMContentLoaded', function() {
        const closeSidebar = document.querySelector('.close-sidebar');
        closeSidebar.addEventListener('click', function() {
            sidebar.classList.add('hidden');
        });
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
        console.log("Uploaded Image:", UploadedImage);
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

            if(vertexesTab && !vertexesTab.closed) {
                const vertexesContent = vertexesTab.document.body.innerText;
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
                    console.log("CEMANA:", listing);
                    const listingArray = listing.split(',').map(hip => hip.trim());
                    const points = listingArray.map(hip => {
                        const pointIndex = text.findIndex((t) => t === hip);
                        if(pointIndex === -1) {
                            return null;
                        }
                        return {x:lon[pointIndex], y:lat[pointIndex]};
                    }).filter(point => point !== null);
                    //const polygon = points.join('');  
                    console.log("APA ISINYA ???:",points);
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

                        console.log("1", RAmax);
                        console.log("2", RAmin);
                        console.log("3", DEmax);
                        console.log("4", DEmin);
                    }
                } 
            }

            if (position) {
                const avgLon = position.avgLon || position.firstLon;
                const avgLat = position.avgLat || position.firstLat;
                console.log("MENJAWAB RAMAX", RAmax);
                console.log("MENJAWAB RAMIN", RAmin);
                console.log("MENJAWAB DEMAX", DEmax);
                console.log("MENJAWAB DEMIN", DEmin);
                console.log("MENJAWAB TOTAL RA", RAtotal);
                console.log("MENJAWAB TOTAL DE", DEtotal);

                document.getElementById('pixel-coordinates').classList.remove('hidden');
                document.getElementById('second-sidebar-container').classList.add('show-overflow');

                let lonRange;
                if(RAtotal > 0) {
                    lonRange = [avgLon - 0.5*RAtotal, avgLon + 0.5*RAtotal];
                } else {
                    lonRange = [0.5*RAtotal + avgLon, 0.5*RAtotal + avgLon];
                }
                const latRange = [avgLat - 0.5*DEtotal, avgLat + 0.5*DEtotal];   
    
                console.log("LONRANGE", lonRange);
                console.log("LATRANGE", latRange);
                Plotly.relayout('plot', {
                    'geo.center.lon': avgLon,
                    'geo.center.lat': avgLat,
                    'geo.projection.type': 'mollweide', 
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
        console.log("PIXEL KORDINAT 55:",pixelCoordinates);
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
        console.log("mencuat", MidLat && MidLon);

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
        
        const targetID = `CON ${folderName} ${number}`;
        const existingEntry = constellationsList.findIndex(m=>m.id === targetID);
        if(existingEntry>-1){
            constellationsList[existingEntry].image = {
                file: picture,
                size: [actualwidth, actualheight],
                anchors: [
                    {pos: `${parseFloat(pixelCoordinates[0].split(' ')[0])}, ${parseFloat(pixelCoordinates[0].split(' ')[1])}`, hip: `${selectedStarNames[0]}` },
                    {pos: `${parseFloat(pixelCoordinates[1].split(' ')[0])}, ${parseFloat(pixelCoordinates[1].split(' ')[1])}`, hip: `${selectedStarNames[1]}` },
                    {pos: `${parseFloat(pixelCoordinates[2].split(' ')[0])}, ${parseFloat(pixelCoordinates[2].split(' ')[1])}`, hip: `${selectedStarNames[2]}` },
                ]
            };
        };

        const coordContent = `${number} ${picture} ${pixelCoordinates[0]} ${selectedStarNames[0]} ${pixelCoordinates[1]} ${selectedStarNames[1]} ${pixelCoordinates[2]} ${selectedStarNames[2]}`;
        if (!coordTab) {
            coordTab = window.open();
            coordTab.document.write('<pre>' + coordContent + '</pre>');
            coordTab.document.title = "Constellation Artwork";
            coordTab.document.close();        
        } else {
            coordTab.document.querySelector('pre').innerHTML += '\n' + coordContent;//coordTab.document.body.innerHTML += '<pre>' + coordContent + '</pre>';
        }
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

    document.getElementById('display-artwork').addEventListener('click', () => {
    });


    function openScroll() {
        document.getElementById('myScroll').style.display = 'block';
    }
    function closeScroll () {
        document.getElementById('myScroll').style.display = 'none';
    }
    document.querySelector('.close-papy').addEventListener('click', closeScroll);

    const optOut = localStorage.getItem('optMyScroll');

    if(!optOut) {
        window.onload = function() {
            openScroll();
        };    
    }

    document.getElementById('optCheckbox').addEventListener('change', function() {
        if(this.checked) {
            localStorage.setItem('optMyScroll', 'true');
        } else {
            localStorage.removeItem('optMyScroll');
        }
    })

    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('scrollToTop').addEventListener('click', function() {
            document.querySelector('.overlay-text').scrollTo({
                top:0,
                behavior:'smooth',
            })
        });
    });

    document.getElementById('manual').addEventListener('click', function() {
        var papyrus = document.getElementById('myScroll');
        papyrus.style.display = 'block';
    });

    
};
