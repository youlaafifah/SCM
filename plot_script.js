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
//                range: [-180, -180]
            },
            lataxis: {
                showgrid: true,
                gridcolor: 'white',
                gridwidth: 0.5,
                tick0: -90,
                dtick: 30,
                range: [-90, 90]
            },
//            center: { lon: 0, lat: 0 },
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
    var traceIndices =[]; // To track the trace indice

    var newstickFigure = []; // track new stickFigure from openfolder
    var newtraceIndices = [];

    let hullTraceIndice = [];

    let selectedLineIndex = null; // To track the selected line index
    let previousSelectedLineIndex = null // To track previously selected line index

    let chosenFolderHandle = null; // variable to store the folder handle selected in openfolder
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
        console.log("regionDroplist() called");
        classificationDroplist();
        console.log("classificationDroplist() called");

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
            const parts = line.split(' ');
            return parts.slice(2).join(' '); // (2) because, the HIP list is started at the third column. When 1stcolumn is 0.
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
                    color: 'green',
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
        document.getElementById('regionSearch').style.display = 'block'; // Show the dropdown menu
        document.getElementById('regionSearch').addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            regionDropMenu.innerHTML = ''; // Clear previous options
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
                        addedRegions.add(theRegion); // Add to the set of added regions
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
            regionDropMenu.style.display = 'block'; // Show the dropdown menu
        });
        document.addEventListener('click', function(event) {
            if (!regionDropMenu.contains(event.target) && event.target !== document.getElementById('regionSearch')) {
                regionDropMenu.style.display = 'none'; // Hide the dropdown menu
            }
        });
    }
    
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
        classificationDropMenu.innerHTML = ''; // Clear previous options
        classifications.forEach(classification => {
            const optionClassification = document.createElement('option');
            optionClassification.value = classification.name;
            optionClassification.textContent = classification.name;
            optionClassification.title = classification.info; // Set the title attribute to the value
            classificationDropMenu.appendChild(optionClassification);
        });
        classificationDropMenu.style.display = 'block'; // Show the dropdown menu
        classificationDropMenu.addEventListener('change', function() {
            classificationName = this.value.trim();
            classificationDropMenu.style.display = 'none'; // Hide the dropdown menu
            document.getElementById('regionDropdown').style.display = 'none'; // Hide the region dropdown menu
            document.getElementById('regionSearch').style.display = 'none';

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
                            lon: [points[j].x + lonOffset, points[j + 1].x - lonOffset], // Connect point(j) and point (j+1) //points.map(point => point.x),
                            lat: [points[j].y + latOffset, points[j + 1].y - latOffset], //points.map(point => point.y),
                            line: {
                                color:'green',
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

    let selectHIP = [];
    let selectHIPName = [];

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
            calculating_fourthPoint ();
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
                            color:'blue',
                            width:5,
                            opacity:0.5
                        },
                    };
    
                    Plotly.addTraces('plot',lineTrace).then(function(additionResult){
                        traceIndices.push(additionResult);
                        stickFigure.push([...lines]);
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
                    Plotly.restyle('plot', {line: {width:2, opacity: 0.5, color:'blue'}}, [previousSelectedLineIndex]);
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
                stickFigure.pop(); //.splice(currentTraceCount - 1, 1); // Adjust index because star trace is at index 0
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
    function showInput(AddingManual) {
        const container = document.getElementById('manual-input-container');
        //container.innerHTML = '';
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
            objectInput.placeholder = 'Click the Star or Insert the star HIP number';
            MultiplyInput.appendChild(objectInput);
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

            const objectLabel = document.createElement('label');
            objectLabel.setAttribute('for', 'inputDSOManual');
            objectLabel.textContent = 'Deep Sky Object:';
            MultiplyInput.appendChild(objectLabel);
            const objectInput = document.createElement('input');
            objectInput.type =  'text';
            objectInput.id = 'inputDSOManual';
            objectInput.placeholder = 'Insert the Deep Sky Object Name';
            MultiplyInput.appendChild(objectInput);
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
        //ROUTINE 1 : membaca sisi KANAN HIP besar = membaca original polygon
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
    

    //This function is using Andrew's monotone chain algorithm, Graham Scan algorithm
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
    
    let SaveAsCount = 0;


    function formatNum(num) {
        return num.toString().padStart(3,'0');
    }

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
/*        if(maxLong <= 0 && minLong >= -360){
            const longDiff = minLong - maxLong;
            for (let i = 0; i < modi.length; i++){
                for (let j = 0; j < modi[i].length; j++) {
                    let long = modi[i][j].x;
                    if (longDiff < -180 && long > -180) {
                        long += -360;
                    }
                    modi[i][j].x = long;
                }
            }
            console.log("SECOND modi", modi);
        }*/
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

        const vertexesContent = `${nomor} ${vertexHIPs}`;

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

        const insideContent = `${nomor} ${insideHIPs}${insidemirror}`;

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
        
        fileContents = stickFigure.map((line,index) => {
            const hips = new Set(line.map(point => {
                return text.find((hip, i) => {
                    const lon = lon_array[i];
                    const lat = lat_array[i];
                    return Math.abs(lon - point.x) < 1e-6 && Math.abs(lat - point.y) < 1e-6;
                });
            }).filter(Boolean));
            return `[${[...hips].map(hip=>hip.replace('HIP','').trim()).join(', ')}]`.trim(); //Remove the term "HIP"
        }).join(', ');



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
        stickFigure = [];
        lastPoint = null;
    });


    
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
//            let hasLonRange1 = false; // -360<=x<=-270
//            let hasLonRange2 = false; // -90<=x<=0

            for(let i = 0; i < stickFigure.length; i++) {
                for (let j = 0; j < stickFigure[i].length; j++) {
                    const lon = stickFigure[i][j].x;
                    minLon = Math.min(minLon, lon);
                    maxLon = Math.max(maxLon, lon);
/*                    if(lon >= -360 && lon <= -270) {
                        hasLonRange1 = true;
                    }
                    if(lon >= -90 && lon <= 0) {
                        hasLonRange2 = true;
                    }*/
                }
//                console.log("minmaxLon", {minLon, maxLon});
            }
            if (maxLon<=0 && minLon>= -360){//(hasLonRange1 &&  hasLonRange2) {
                const lonDiff = minLon - maxLon;
                for(let i = 0; i < stickFigure.length; i++) {
                    for (let j = 0; j < stickFigure[i].length; j++) {
                        let lon = stickFigure[i][j].x;
                        if(lonDiff<-180 && lon>-180){//(lon >= -180 && lon <= 0) {
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
                                color: 'green',
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


    let dataset = {
        dataArray: [],
    };

    function addData() {
        if(folderName && nomor && labelTranslated && labelNative && labelPronounce && fileContents) {
                const Entry = {
                skyculture: folderName,
                cultureRegion: regionName,
                cultureClassification: classificationName,
                lines_ar: fileContents,
                number:nomor,
                common_name_one: {
                    english: labelTranslated, 
                    native: labelNative, 
                    pronounce: labelPronounce,
                },
            };
            dataset.dataArray.push(Entry);   
        }
    }
    
    /*
    const listConstellations = {};
                id: `CON ${entry.skyculture} ${entry.number}`,
                lines: entry.lines_ar,
                common_name: {
                    english: entry.common_name_one.english,
                    native: entry.common_name_one.native,
                    pronounce: entry.common_name_one.pronounce,
                },

    */

    function download_JSON_Format() {
        function filterEmpty(obj){
            return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null && v !== ''));
            
        }
//        const NamesForConstellation = LabelNames.map(ln => `"english": "${ln.labelTranslated}", "native": "${ln.labelNative}", "pronounce": "${ln.labelPronounce}"`);
        // Structure of JSON output
        const index_JSON = {
            id: folderName,
            region: regionName,
            classification: classificationName,
            fallback_to_international_names: false,
//            cobaan: NamesForConstellation,
            constellations: dataset.dataArray.map(entry => ({
                id: `CON ${entry.skyculture} ${entry.number}`,
                lines: entry.lines_ar,
                common_name: {
                    english: entry.common_name_one.english,
                    native: entry.common_name_one.native,
                    pronounce: entry.common_name_one.pronounce,
                },
            })),
            common_names: commonNames,
        };

        const jsonstring = JSON.stringify(index_JSON,null,2);
        const blob = new Blob([jsonstring], {type: 'application/json'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'constellation-artwork.json';
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
            addData();
            download_JSON_Format();
            /*
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
            */

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
                    return part.slice(1).join(' ');
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
    
    document.getElementById('image-upload').addEventListener('change', (e) => {
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
                    fourthPixel();
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
                    fourthPixel();
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

                //const lonRange = [RAmin + 0.5*RAtotal , RAmax + 0.5*RAtotal];
                //const latRange = [avgLat - 20, avgLat + 20];      
                //const lonRange = [RAmin - 0.5*RAtotal, RAmax + 0.5*RAtotal];
                let lonRange;
                if(RAtotal > 0) {
                    lonRange = [RAmin - 0.5*RAtotal, RAmax + 0.5*RAtotal];
                } else {
                    lonRange = [0.5*RAtotal + RAmin, 0.5*RAtotal + RAmax];
                }
                const latRange = [DEmin - 0.5*DEtotal, DEmax + 0.5*DEtotal];   
    
                console.log("LONRANGE", lonRange);
                console.log("LATRANGE", latRange);
                Plotly.relayout('plot', {
                    'geo.center.lon': avgLon,
                    'geo.center.lat': avgLat,
                    'geo.projection.type': 'mollweide', // 'orthographic' jadi bulat bola
                    'geo.lonaxis.range' : lonRange,
                    'geo.lataxis.range' : latRange,
                    //'geo.zoom': 10,
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

    let threeHIPAvg;
    let threePixelAvg;
    let scales;

    function calculating_fourthPoint () {
        //hitung avg HIP = selectedStars
        let sumRA = 0;
        let sumDE = 0;

        for(let i = 0; i < Math.max(3, selectedStars.length); i++) {
            sumRA += selectedStars[i].lon;
            sumDE += selectedStars[i].lat;
        }
        const centroidRA = sumRA / 3;
        const centroidDE = sumDE / 3;
        threeHIPAvg = {lon:centroidRA, lat:centroidDE};
        console.log("HIP AVG:", threeHIPAvg);


    }

    function fourthPixel() {
        //hitung avg PIXEL = pixelCoordinates
        let sumPixX = 0;
        let sumPixY = 0;

        for (let j = 0; j < Math.max(3, pixelCoordinates.length); j++) {
            const pixel = pixelCoordinates[j].split(' ');
            const XPix = parseFloat(pixel[0]);
            const YPix = parseFloat(pixel[1]);
            if (!isNaN(XPix) && !isNaN(YPix)) {
                sumPixX += XPix;
                sumPixY += YPix;
            } else {
                console.error("Invalid pixel coordinates:", pixelCoordinates[j]);
                warn(`Invalid values at index ${j}: X=${selectedStars[j].x}, Y=${selectedStars[j].y}`);
            }
        }
        console.log("PIXEL SUM77:",sumPixX);
        console.log("PIXEL SUM78:",sumPixY);
        const centroidPixX = sumPixX / 3;
        const centroidPixY = sumPixY / 3;
        threePixelAvg = {x:centroidPixX, y:centroidPixY};
        console.log("PIXEL AVG:", threePixelAvg);        

    }

    function scalling() {
        //hitung jarak avg HIP ke salah satu HIP
        const HIPRAscale0 = Math.abs(threeHIPAvg.lon - selectedStars[0].lon);
        const HIPDEscale0 = Math.abs(threeHIPAvg.lat - selectedStars[0].lat);
        const HIPRAscale1 = Math.abs(threeHIPAvg.lon - selectedStars[1].lon);
        const HIPDEscale1 = Math.abs(threeHIPAvg.lat - selectedStars[1].lat);
        const HIPRAscale2 = Math.abs(threeHIPAvg.lon - selectedStars[2].lon);
        const HIPDEscale2 = Math.abs(threeHIPAvg.lat - selectedStars[2].lat);

        const dHIPRA = (HIPRAscale0 + HIPRAscale1 + HIPRAscale2) / 3;
        const dHIPDE = (HIPDEscale0 + HIPDEscale1 + HIPDEscale2) / 3;

        //hitung jarak avg PIXEL ke salah satu pixel
        const PixXscale0 = Math.abs(threePixelAvg.x - parseFloat(pixelCoordinates[0].split(' ')[0]));
        const PixYscale0 = Math.abs(threePixelAvg.y - parseFloat(pixelCoordinates[0].split(' ')[1]));
        const PixXscale1 = Math.abs(threePixelAvg.x - parseFloat(pixelCoordinates[1].split(' ')[0]));
        const PixYscale1 = Math.abs(threePixelAvg.y - parseFloat(pixelCoordinates[1].split(' ')[1]));
        const PixXscale2 = Math.abs(threePixelAvg.x - parseFloat(pixelCoordinates[2].split(' ')[0]));
        const PixYscale2 = Math.abs(threePixelAvg.y - parseFloat(pixelCoordinates[2].split(' ')[1]));

        const dPixX = (PixXscale0 + PixXscale1 + PixXscale2) / 3;
        const dPixY = (PixYscale0 + PixYscale1 + PixYscale2) / 3;

        //lalu bagi untuk dijadikan scale dari dimensi gambar
        const scaleRA = dHIPRA/ dPixX;
        const scaleDE = dHIPDE/ dPixY;
        scales = {lon:scaleRA, lat:scaleDE};

        console.log("SCALEs:",scales);
        console.log("RA SCALE:",scaleRA);
        console.log("DE SCALE:",scaleDE);
        console.log("HIPRA:",dHIPRA);
        console.log("HIPDE:",dHIPDE);
        console.log("PIXRA:",dPixX);
        console.log("PIXDE:",dPixY);

    
    }



    var displaying_enabled = false;

    document.getElementById('display-image').addEventListener('click', () => {
        displaying_enabled = !displaying_enabled;
        var mode = displaying_enabled ? 'enabled' : 'disabled';
        console.log(`Displaying mode ${mode}`);
        if(displaying_enabled) {
            document.getElementById('display-image').style.backgroundColor = 'orange';
//            calculating_fourthPoint();
//            scalling();
            addImageToPlot();
            document.getElementById('artwork-container').classList.remove('hidden');
        } else {
            document.getElementById('display-image').style.backgroundColor = 'white';
            document.getElementById('artwork-container').classList.add('hidden');
            removeImageFromPlot();
        }
        const selectedLabel = document.getElementById('constellation-select').value;
        const position = constellationLabels[selectedLabel] || constellationMidpoints[selectedLabel];
        const MidLon = position.avgLon || position.firstLon;
        const MidLat = position.avgLat || position.firstLat;
        console.log("mencuat", MidLat && MidLon);

    });   

    function addImageToPlot() {
        const opac = opacitySlider.value;
        console.log("Adding images to plot...");
        const imageUrl = UploadedImage;
        const imaLoc = { lon: 0, lat: 0 };
        const imageObject = {
          source: imageUrl,
          xref: "geo",
          yref: "geo",
          x: (imaLoc.lon + 180) / 360,  // Map lon to [0, 1] range (paper coordinates)
          y: 1 - (imaLoc.lat + 90) / 180, // Map lat to [0, 1] range (paper coordinates)
          sizex: 1,
          sizey: 1,
          xanchor: "center",
          yanchor: "middle",
          sizing: "contain",
          opacity: opac,
          layer: "above"
        };
        Plotly.relayout('plot', { images: [imageObject] });
    };

    function removeImageFromPlot() {
        console.log("Removing images from plot...");
        Plotly.relayout('plot', { images: [] });
    };

    document.getElementById('save-coor').addEventListener('click', async () => {
        const selectedLabel = document.getElementById('constellation-select').value;
        const position = constellationLabels[selectedLabel] || constellationMidpoints[selectedLabel];
        const number = position.labelnumber || position.starnumber;
        
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
/*        var image_update = {
            images: [{
                source: UploadedImage,
                xref: 'geo', //'x',
                yref: 'geo', //'y',
                x: threeHIPAvg.x,
                y: threeHIPAvg.y,
                sizex: scales.x,
                sizey: scales.y,
                sizing: 'stretch',
                layer: 'above',
            }]
        };
        console.log("link:", source);
        console.log("xref:", xref);
        console.log("yref:", yref);
        console.log("x:", threeHIPAvg.lon);
        console.log("y:", threeHIPAvg.lat);
        console.log("sizex:", scaleRA);
        console.log("sizey:", scaleDE);
        Plotly.relayout('plot', image_update);
*/

        // Normalize longitude to the 0-360° range
        function normalizeLongitude(lon) {
        return lon % -360;
        }

        // Cross product to determine turn direction
        function crossProduct(o, a, b) {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        }

        // Graham's Scan algorithm to compute convex hull
        function grahamScan(points) {
        // Sort points by latitude, then by longitude
        points.sort((a, b) => a[1] === b[1] ? a[0] - b[0] : a[1] - b[1]);

        const lowerHull = [];
        for (const point of points) {
            while (lowerHull.length >= 2 && crossProduct(lowerHull[lowerHull.length - 2], lowerHull[lowerHull.length - 1], point) <= 0) {
            lowerHull.pop();
            }
            lowerHull.push(point);
        }

        const upperHull = [];
        for (let i = points.length - 1; i >= 0; i--) {
            const point = points[i];
            while (upperHull.length >= 2 && crossProduct(upperHull[upperHull.length - 2], upperHull[upperHull.length - 1], point) <= 0) {
            upperHull.pop();
            }
            upperHull.push(point);
        }

        // Remove duplicate end points
        upperHull.pop();
        lowerHull.pop();

        return lowerHull.concat(upperHull);
        }

        // Main function to compute convex hull for points with longitudes in the 0-360° range
        function computeConvexHull(longitudes, latitudes) {
        // Combine longitudes and latitudes into point tuples
        let points = longitudes.map((lon, index) => [normalizeLongitude(lon), latitudes[index]]);

        // Split points into two groups: left and right of the anti-meridian
        const leftOfAntiMeridian = points.filter(p => p[0] >= -180);
        const rightOfAntiMeridian = points.filter(p => p[0] < -180);

        // Compute convex hulls separately for each group
        const hullLeft = grahamScan(leftOfAntiMeridian);
        const hullRight = grahamScan(rightOfAntiMeridian);

        // Merge the two hulls (if necessary, depending on your application)
        return hullLeft.concat(hullRight); // Adjust merging logic as needed
        }

        // Example usage with dummy data
        const longitudes = [-350, -10, -190, -200];
        const latitudes = [10, 20, 30, 40];
        const coords = longitudes.map((lon, index) => [lon, latitudes[index]]);

        const convexHull = computeConvexHull(longitudes, latitudes);
        console.log("Convex Hull Points:", convexHull);

        const pointstrace = {
            type: 'scattergeo',
            mode: 'markers',
            lon: coords.map(p => p[0]),
            lat: coords.map(p => p[1]),
            marker: {
                color: 'blue',
                size: 10,
            },
        };
        Plotly.addTraces('plot', pointstrace).then(() => {
            Plotly.relayout('plot', {
                'geo.scope': 'mollweide',
            });
        }).catch((error) => {
            console.error("Error adding trace:", error);
        });
        const hullTrace = {
            type: 'scattergeo',
            mode: 'lines',
            lon: convexHull.map(p => p[0]),
            lat: convexHull.map(p => p[1]),
            line: {
                color: 'red',
                width: 2,
            },
        };
        Plotly.addTraces('plot', hullTrace).then(() => {
            Plotly.relayout('plot', {
                'geo.scope': 'mollweide',
            });
        }).catch((error) => {
            console.error("Error adding trace:", error);
        });
    });

    /*
    */


    function openPermission() {
        document.getElementById('askPermission').style.display = 'block';
    }
    function closePermission() {
        document.getElementById('askPermission').style.display = 'none';
    }
    document.querySelector('.close-permission').addEventListener('click', closePermission);
    document.getElementById('ok-upload').addEventListener('click', function() {
        const checkbox = document.getElementById('Checkbox');
        if(checkbox.checked) {
            localStorage.setItem('optPermission', 'true');
        }
        closePermission();
    });
    const optOutPermission = localStorage.getItem('optPermission');
    if(!optOutPermission) {
        window.onload = function() {
            openPermission();
        };
    }
    document.getElementById('Checkbox').addEventListener('change', function() {
        if(this.checked) {
            localStorage.setItem('optPermission', 'true');
        } else {
            localStorage.removeItem('optPermission');
        }
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
