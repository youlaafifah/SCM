function initFileManager() {
    let hasCMake = false;
    let chosenFolderHandle;
   
    document.getElementById('openfolder').addEventListener('click', async () => {
        try {
            chosenFolderHandle = await window.showDirectoryPicker();
            if (!chosenFolderHandle) {
                console.log("User cancel chosing folder");
                return;
            }
            window.culture.folderName = chosenFolderHandle.name;
            localStorage.setItem('foldername', window.culture.folderName);

            window.culture.daftarkonstelasi = window.culture.daftarkonstelasi || [];
            window.culture.constellationsList = window.culture.constellationsList || {};
            window.culture.commonNames = window.culture.commonNames || {};

            try {
                const scmFileHandle = await chosenFolderHandle.getFileHandle('SCM.json', {create: false});
                const scmFile = await scmFileHandle.getFile();
                const scmtext = await scmFile.text();
                const existingData = JSON.parse(scmtext);
                if (existingData.konstelasi && Array.isArray(existingData.konstelasi)){
                    window.culture.daftarkonstelasi = existingData.konstelasi;
                }
                if (existingData.lokal) {
                    window.culture.commonNames = existingData.lokal || {};
                }

                const indexFileHandle = await chosenFolderHandle.getFileHandle('index.json', {create: false});
                const indexFile = await indexFileHandle.getFile();
                const indextext = await indexFile.text();
                const existingStell = JSON.parse(indextext);
                if (existingStell.constellations && Array.isArray(existingStell.konstelasis)){
                    window.culture.constellationsList = existingStell.constellations;
                }

                window.culture.showinglabels = [];
                window.culture.showingStickFigures = [];
                existingData.konstelasi.forEach(konstelasi => {
                    const namaNative = konstelasi.nama?.native?.trim() || konstelasi.nama?.english?.trim() || "—";
                    const centroid = konstelasi.centroid;
                    if (centroid && typeof centroid.visualRA === 'number' && typeof centroid.decDeg === 'number') {
                        window.culture.showinglabels.push({
                            starName: namaNative,
                            lon: centroid.visualRA,
                            lat: centroid.decDeg
                        })
                    } else {
                        console.warn(`No Centroid for: ${konstelasi.entitas}`);
                    }
                    if(konstelasi.koordinatgaris && Array.isArray(konstelasi.koordinatgaris)) {
                        const stickLines = konstelasi.koordinatgaris.map(pasangan => {
                            if(pasangan.length === 2) {
                                return {
                                    mulai: pasangan[0], akhir: pasangan[1]
                                }
                            }
                            return null;
                        }).filter(Boolean);
                        if (stickLines.length > 0 ) {
                            window.culture.showingStickFigures.push({
                                lines: stickLines
                            })
                        }
                    }
                })
                showingallLabels();
                showingallStickFigures();
                let loadedRegion = existingData.bagian;
                if (loadedRegion && typeof loadedRegion === 'string' && loadedRegion.trim() !== '') {
                    window.culture.regionName = loadedRegion.trim();
                } else {
                    window.culture.regionName = "Unknown";
                }
                const regionInput = document.getElementById('regionSearch');
                if (regionInput) {
                    regionInput.value = window.culture.regionName;
                    if (window.culture.regionName === "Unknown" || !window.culture.regionName.trim()) {
                        regionDroplist();
                    }
                }
                const loadedClassification = existingData.klasifikasi?.[0] || "";
                window.culture.classificationName = loadedClassification.trim() || "Personal";
                const classificationSelect = document.getElementById('classificationDropdown');
                if (classificationSelect) {
                    classificationSelect.value = window.culture.classificationName;
                    if (!window.culture.classificationName || window.culture.classificationName === "Select a classification") {
                        classificationDroplist();
                    }
                }
                
            } catch (e) {
                console.log("No SCM.json or error,start from null:", e.message);
                window.culture.daftarkonstelasi = [];
                window.culture.constellationsList = [];
                window.culture.regionName = "Unknown";
                window.culture.classificationName = "";
                const regionInput = document.getElementById('regionSearch');
                if (regionInput) {
                    regionInput.value = "Unknown";
                    regionDroplist();
                }
                classificationDroplist();
            }
            async function openTextTab(filename, tabKey, title) {
                try {
                    const fileHandle = await chosenFolderHandle.getFileHandle(filename, { create: false });
                    const file = await fileHandle.getFile();
                    const content = await file.text();
                    let tab = window.appState[tabKey];
                    if (!tab || tab.closed) {
                        tab = window.open('', '_blank');
                        if (!tab) {
                            console.warn(`Fail to open ${filename}`);
                            return;
                        }
                        window.appState[tabKey] = tab;
                    }
                    tab.document.open();
                    tab.document.write('<pre>' + content + '</pre>');
                    tab.document.title = `${title}`;
                    tab.document.close();
                } catch (err) {
                    console.log(`${filename} not found or failed to open:`, err.message);
                }
            }
            await openTextTab('Vertex.fab', 'vertexesTab', 'Vertex info');
            await openTextTab('Inside.fab', 'insideTab', 'Star Lists');
            await openTextTab('constellationship.fab', 'saveAsTab', 'Stickfigure');
            await openTextTab('constellation_names.fab', 'labelTab', 'Stickfigure Names');
            await openTextTab('Mid_point.fab', 'avgTab', 'Midpoints');
            await openTextTab('constellationsart.fab', 'coordTab', 'Artwork');
            async function openDescription() {
                try{
                    const descHandle = await chosenFolderHandle.getFileHandle('description.md', { create: false });
                    const descFile = await descHandle.getFile();
                    const descText = await descFile.text();
                    let descTab = window.appState.descriptionTab;
                    if (!descTab || descTab.closed) {
                        descTab = window.open('', '_blank');
                        if (!descTab) return;
                        window.appState.descriptionTab = descTab;
                    }
                    descTab.document.open();
                    descTab.document.body.innerText = descText;
                    descTab.document.title = `description.md - ${window.culture.folderName}`;
                    descTab.document.close();
                } catch (err){
                    console.log("description.md not found:", err.message);
                }
                
            }
            await openDescription();

            try {
                await chosenFolderHandle.getFileHandle('CMakeLists.txt', { create: false });
                hasCMake = true;
            } catch {}
            if (!hasCMake) {
                try {
                    const CMakeFileHandle = await chosenFolderHandle.getFileHandle('CMakeLists.txt', {create: true});
                    const CMakeStream = await CMakeFileHandle.createWritable();
                    const CMakecontent = `get_filename_component(skyculturePath "\${CMAKE_CURRENT_SOURCE_DIR}" REALPATH)
get_filename_component(skyculture \${skyculturePath} NAME)
install(DIRECTORY ./ DESTINATION \${SDATALOC}/skycultures/\${skyculture}
        FILES_MATCHING PATTERN "*"
        PATTERN "CMakeLists.txt" EXCLUDE)
 `;
                    await CMakeStream.write(CMakecontent);
                    await CMakeStream.close();
                } catch (err) {
                    console.warn("Failed to make CMakeLists.txt:", err.message);
                }
            }
    //        updateConstellationOptions();
        } catch (err) {
            console.error("Fail to open folder:", err);
        }
    });

    //  REGION DROPLIST
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
                window.culture.regionName = region;
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
                            window.culture.regionName = theRegion;
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
                        window.culture.regionName = region;
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
            window.culture.classificationName = this.value.trim();
        });
    }



    function tableToWiki (table) {
        let wiki = '{|class="wikitable sortable mw-collapsible"\n|+\n';
        const rows = table.rows;

        for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].cells;
            const isHeaderRow = i === 0 && cells[0].tagName === 'TH';

            wiki += '|-\n';
            for (let j = 0; j < cells.length; j++) {
                const cell = cells[j];
                const tag = (isHeaderRow || cell.tagName === 'TH') ? '!' : '|';
                let content = cell.innerHTML.trim();
                content = content.replace(/\|/g, '{{!}}');
                wiki += `${tag} ${content}\n`;
            }
        }
        wiki += '|}\n';
        return wiki;
    }
    function infoboxWiki (table) {
        let infobox = '{{Infobox constellation\n';
        const infos = {
            'Name' : 'name',
            'Native' : 'native',
            'Translation' : 'translation',
            'Pronounce' : 'pronounce',
            'IPA' : 'IPA',
            'Culture' : 'culture',
            'RA' : 'RA',
            'dec' : 'dec',
            'Areatotal' : 'areatotal',
            'Numbermainstars' : 'numbermainstars',
            'Numberbfstars' : 'numberbfstars',
            'Numberstarsplanets' : 'numberstarsplanets',
            'Numberbrightstars' : 'numberbrightstars',
            'Numbernearbystars' : 'numbernearbystars',
            'Brighteststarname' : 'brighteststarname',
            'Starmagnitude' : 'starmagnitude',
            'Neareststarname' : 'neareststarname',
            'Stardistance' : 'stardistance',
            'Numbermessierobjects' : 'numbermessierobjects',
            'Meteorshowers' : 'meteorshowers',
            'Bordering' : 'bordering',
            'Notes' : 'notes'
        };
        Array.from(table.rows).forEach(row => {
            const cells = row.cells;
            if(cells.length <2) return;
            const key = cells[0].textContent.trim().replace(/:$/, '');
            let val = cells[1].textContent.trim();
            const param = infos[key] || key.toLowerCase().replace(/\s+/g, '_');
            infobox += `| ${param} = ${val}\n`;
        });
        return infobox + '}}';
    }


    document.getElementById('submit').addEventListener('click', async () => {
        if (!chosenFolderHandle) {
            alert("Please select a folder first using the 'Open Folder' button.");
            return;
        }
        if(!window.appState.insideTab || window.appState.insideTab.closed) {
            console.log("insideTab is closed, skip wikitable");
        } else {
            try {
                const doc = window.appState.insideTab.document;
                const tables = doc.querySelectorAll('table');
                if (tables.length === 0) {
                    console.log('Warning: No tables found in the review tab.');
                    return;
                }
                let output = '';
                tables.forEach((t, idx) => {
                    if (idx > 0) output += '\n';
                    output += tableToWiki(t);
                })
                const WikiFileHandle = await chosenFolderHandle.getFileHandle('wikitable.ase', {create:true});
                const WikiStream = await WikiFileHandle.createWritable();
                await WikiStream.write(output);
                await WikiStream.close();
            } catch (err) {
                alert("error");
            }
        }
        if(!window.appState.vertexesTab || window.appState.vertexesTab.closed) {
            console.log("vertexesTab is closed, skip infobox");
        } else {
            try {
                const tables = window.appState.vertexesTab.document.querySelectorAll('table');
                if (tables.length === 0) {
                    console.log('Warning: No tables found in the review tab.');
                    return;
                }
                let output = '';
                tables.forEach((t, idx) => {
                    output += infoboxWiki(t);
                    if (idx < tables.length - 1) {
                        output += '\n\n';
                    }
                })
                const contentformat = output;
                const InfoFileHandle = await chosenFolderHandle.getFileHandle('infobox.ase', { create: true });
                const InfoStream = await InfoFileHandle.createWritable();
                await InfoStream.write(contentformat);
                await InfoStream.close();
            } catch (err) {
                alert("error"+ err.message);
            }
        }
        try {
            const index_JSON = {
                id: window.culture.folderName,
                region: window.culture.regionName || "Unknown",
                classification: [window.culture.classificationName || "Personal"],
                fallback_to_international_names: false,
                constellations: window.culture.constellationsList || [],
                common_names: window.culture.commonNames || {},
            };
            let jsonstring = JSON.stringify(index_JSON,null,2);
            const jsonFileHandle = await chosenFolderHandle.getFileHandle('index.json', {create: true});
            const jsonStream = await jsonFileHandle.createWritable();
            await jsonStream.write(jsonstring);
            await jsonStream.close();

            const SCM_JSON = {
                id: window.culture.folderName,
                bagian: window.culture.regionName || "Unknown",
                klasifikasi: [window.culture.classificationName || "Personal"],
                konstelasi: window.culture.daftarkonstelasi || [],
                lokal: window.culture.commonNames || {}
            };
            let SCMstring = JSON.stringify(SCM_JSON,null,2);
            const SCMFileHandle = await chosenFolderHandle.getFileHandle('SCM.json', {create:true});
            const SCMStream = await SCMFileHandle.createWritable();
            await SCMStream.write(SCMstring);
            await SCMStream.close();
        } catch (err) {
            alert("error"+ err.message);
        }
        try{
            async function saveTabContent(tabKey, filename) {
                const Tab = window.appState[tabKey];
                if (!Tab||Tab.closed) {
                    console.log(`No Tab ${tabKey} or closed, skip save ${filename}`);
                    return;
                }
                try{
                    let content; //= Tab.document.body.innerText.trim();
                    const tableTab = ['insideTab', 'vertexesTab'];
                    if(tableTab.includes(tabKey)) {
                        content = Tab.document.body.innerHTML;
                    } else {
                        content = Tab.document.body.innerText.trim();
                    }
                    const fileHandle = await chosenFolderHandle.getFileHandle(filename,{create:true});
                    const writable = await fileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();
                } catch (err) {
                    console.warn(`Gagal menyimpan ${filename}:`, err.message);
                }
            }
            await saveTabContent('saveAsTab', 'constellationship.fab');
            await saveTabContent('vertexesTab', 'Vertex.fab');
            await saveTabContent('insideTab', 'Inside.fab');
            await saveTabContent('labelTab', 'constellation_names.fab');
            await saveTabContent('avgTab', 'Mid_point.fab');
            await saveTabContent('coordTab', 'constellationsart.fab');
            await saveTabContent('descriptionTab', 'description.md')

        } catch (error) {
            console.error("Error saving files:", error);
            alert("Failed to save files. Please try again.");
        }
    });

    let n=0; //Number of convex polygon
    var wrapping_enabled = false;
    function deleteEdges() {
        if (n === 0) return;
        const currentTraces = document.getElementById('plot').data;
        const totalTraces = currentTraces.length;
        if(totalTraces >= n) {
            var indiceToDelete = Array.from({ length:n}, (_,i) => totalTraces - n + i);
            Plotly.deleteTraces('plot', indiceToDelete).then(() => {
                n = 0;
            }).catch(err => console.error("Error deleting traces:", err));
        } else {
            console.log("Not enough traces to delete.");
        }
    };
    function drawAllCH () {
        const hulls = window.culture.showingCH || [];
        n = hulls.length;
        if (hulls.length === 0) return;
        hulls.forEach(hull => {
            const closedPoints = [...hull.points, hull.points[0]];
            const trace = {
                type: 'scattergeo',
                mode: 'lines',
                lon: closedPoints.map(p => p.lon),
                lat: closedPoints.map(p => p.lat),
                line: {
                    color: 'orange',
                    width: 2,
                    dash: 'dash',
                    opacity: 0.3
                },
            };
            Plotly.addTraces('plot', [trace]).catch(err => console.error("Error add hull trace:", err));
        });
    }
    document.getElementById('convex').addEventListener('click', async() => {
        wrapping_enabled = !wrapping_enabled;
        var mode = wrapping_enabled ? 'enabled' : 'disabled';
        console.log(`Wrapping mode ${mode}`);
        updateButtons();
        if(wrapping_enabled) {
            const konstelasis = window.culture.daftarkonstelasi || [];
            if (konstelasis.length === 0) {
                console.warn("No constellation in SCM.json");
                return;
            }
            konstelasis.forEach(konstelasi => {
                const id = konstelasi.entitas;
                const hullPoints = konstelasi.koordinathull || [];
                if (hullPoints.length < 3) {
                    console.warn(`Convex hull for ${id} have no enough dots`);
                    return;
                }
                const formattedHull = hullPoints.map(point => ({
                    lon:point.visualRA, lat: point.decDeg
                }));
                window.culture.showingCH.push({
                    points: formattedHull
                })
            })
            drawAllCH();
        } else {
            deleteEdges();
            window.culture.showingCH = [];
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
    
}
function showingallLabels() {
    const labels = window.culture.showinglabels || [];
    if (labels.length === 0) {return;}
    const plotData = {
        type: 'scattergeo',
        mode: 'text',
        lon: labels.map(item => item.lon),
        lat: labels.map(item => item.lat),
        text: labels.map(item => item.starName),
        textposition: "middle center",
        textfont:{
            color: '#6699e6',
            size: 15,
        }  
    };
    Plotly.addTraces('plot', plotData).then(() => {
        Plotly.relayout('plot', {
            'geo.scope': 'perspective'
        });
    }).catch(function(error) {
        console.error("Error adding text trace:", error);
    });
}
function showingallStickFigures() {
    const figures = window.culture.showingStickFigures || [];
    if (figures.length === 0) return;
    let newstickFigure = []; 
    let newtraceIndices = [];
    figures.forEach(figure => {
        figure.lines.forEach(line => {
            const mulai = line.mulai;
            const akhir = line.akhir;
            const deltaLon = akhir.x - mulai.x;
            const deltaLat = akhir.y - mulai.y;
            const distance = Math.sqrt(deltaLon**2 + deltaLat**2) || 1;
            const offsetFactor = 0.02; 
            const lonOffset = (deltaLon / distance) * offsetFactor;
            const latOffset = (deltaLat / distance) * offsetFactor;
            const trace = {
                type: 'scattergeo',
                mode: 'lines',
                lon: [mulai.x + lonOffset, akhir.x - lonOffset],
                lat: [mulai.y + latOffset, akhir.y - latOffset],
                line: {
                    color: '#333399',
                    width: 2,
                    opacity: 0.6,
                }
            }
            Plotly.addTraces('plot', [trace])
                .then(result => {
                    newtraceIndices.push(result[0]);
                    newstickFigure.push([mulai, akhir]);
                })
                .catch(err => console.error("Error adding stick line:", err));
        })
    })
}


window.initFileManager = initFileManager