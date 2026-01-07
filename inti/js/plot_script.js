function initializePlot(lon_array, lat_array, text_array, size_array, ra_array, mag_array, starname_array, bayername_array, catHR_array, catHD_array, IAUcat_array) {
    const plotData = {
        type: 'scattergeo',
        lon: lon_array, //inverse RA
        lat: lat_array, //Dec
        text: text_array, //HIP
        marker: {
            size: size_array,
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
            projection: { type: 'perspective' },
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
/*
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

    window.addEventListener('beforeunload', (event) => {
        const confirmationMessage = 'Are you sure you want to leave? Your changes may not be saved.';
        event.returnValue = confirmationMessage; // For most browsers
        return confirmationMessage; // For some browsers
    });
*/
    window.onresize = function() {
    Plotly.relayout('plot', {
        width: window.innerWidth,
        height: window.innerHeight
    });
    };

    
};

async function loadAndRenderStars() {
    try {
        const response = await fetch('data/star_data.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
//        console.log("⭐ Data bintang berhasil dimuat!", data.lon_array.length, "entri");

        window.starData = {
            lon_array: data.lon_array,
            lat_array: data.lat_array,
            text_array: data.text_array,
            size_array: data.size_array,
            ra_array: data.ra_array,
            mag_array: data.mag_array,
            starname_array: data.starname_array || [],
            bayername_array: data.bayername_array || [],
            catHR_array: data.catHR_array || [],
            catHD_array: data.catHD_array || [],
            IAUcat_array: data.IAUcat_array || []
        };

        initializePlot (
            window.starData.lon_array,
            window.starData.lat_array,
            window.starData.text_array,
            window.starData.size_array,
            window.starData.ra_array,
            window.starData.mag_array,
            window.starData.starname_array,
            window.starData.bayername_array,
            window.starData.catHR_array,
            window.starData.catHD_array,
            window.starData.IAUcat_array
        )

        window.appState = {
            saveAsTab: null,
            labelTab: null,
            avgTab: null,
            vertexesTab: null, 
            insideTab: null,
            coordTab: null,
            descriptionTab: null,
        }

        window.culture = {
            regionName: '',
            classificationName: '',
            folderName: '',
            commonNames: {},
            constellationsList: [],
            daftarkonstelasi: [],
            showinglabels: [],
            showingStickFigures: [],
            showingCH: []
        }
        // SETELAH plot muncul, baru inisialisasi fitur UI lain
        // Ini penting: urutan eksekusi!
        if (typeof initOverlays === 'function') {
            initOverlays();
        }
        if (typeof openScroll === 'function') {
            openScroll(); 
        }
        if (typeof initFileManager === 'function') {
            initFileManager();
        }
        if (typeof initConstellationTools == 'function') {
            initConstellationTools();
        }

    } catch (error) {
        console.error('Error loading star data:', error);
    }
}

// 3. Jalankan saat halaman siap
window.addEventListener('load', loadAndRenderStars);