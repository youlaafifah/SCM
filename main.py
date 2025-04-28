import pandas as pd

# Load the CSV file into a DataFrame
df = pd.read_csv('HIPcat.csv')

# Apply the Magnitude formula to calculate marker size and invert RA to flip the sky horizontally
#factor = 1
df['Vmag'] = 0.0036 * (1 - (0.13 * df['MagV'])) * 1000 #*factor
df['ARA'] = -df['RA']
#If we zoomed in so the factor = zoom ; zoom 4 = factor 4 or factpr = 1/zoom level

# Generate JavaScript arrays from the DataFrame
lon_array = df['ARA'].tolist()
lat_array = df['Dec'].tolist()
text_array = df['Identifier'].tolist()
size_array = df['Vmag'].tolist()
ra_array = df['RA'].tolist()
mag_array = df['MagV'].tolist()



# Create HTML content with placeholders for the JavaScript arrays
html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <link rel="icon" type="image/jpg" href="icon/logo.png">
    <title>Sky Culture-Maker</title>
    <link rel = "stylesheet" href="style.css"/>
    <script src="https://cdn.plot.ly/plotly-3.0.1.min.js"></script>
    <!-- https://cdn.plot.ly/plotly-latest.min.js  -->
    <script src="plot_script.js"></script>
</head>
<body>
    <header>
    <h1>
        <img src="icon/logo.png" alt="logo" style="width:52px;border-radius:50%;">
         Sky Culture-Maker 
        <a href="#" id="manual">
            <img src="icon/1902671.png" alt="Manual Book" style="width:52px;">
        </a>
    </h1>
    </header>
    <main>
    <div id="allbtn">
        <button class="modeButton" id="openfolder" title="Open Folder">
            <img src="icon/folder.png" alt="Open Folder" style="width:24px;">
        </button>
        <button class="modeButton" id="commonName" title="Adding Object">
            <img src="icon/common-name.png" alt="Common Name" style="width:24px;">
        </button>
        <button class="modeButton" id="draw" title="Drawing Line">
            <img src="icon/pencil.png" alt="Draw lines" style="width:24px;">
        </button>
        <button class="modeButton" id="delete" title="Delete">
            <img src="icon/delete.png" alt="Delete" style="width:24px;">
        </button>
        <button class="modeButton" id="label" title="Labeling Asterism">
            <img src="icon/input.png" alt="Label" style="width:24px;">
        </button>  
        <button class="modeButton" id="save-as" title="Save as Asterism">
            <img src="icon/save-as.png" alt="Save" style="width:24px;">
        </button>                
        <button class="modeButton" id="submit" title="Submit Sky Culture">
            <img src="icon/submit.png" alt="Submit" style="width:24px;">
        </button>
        <button id="convex" title="Convex Hull">
            <img src="icon/convexhull.png" alt="Convex Hull" style="width:24px;">
        </button>
        <button class="modeButton" id="converter" title="Converter">
            <img src="icon/converter.png" alt="Converter" style="width:24px;">
        </button>
        <button class="modeButton" id="display-artwork" title="Display Artwork">
            <img src="icon/display-artwork.png" alt="Image" style="width:24px;">
        </button>                        
        <button class="modeButton" id="image" title="Upload Image">
            <img src="icon/image.png" alt="Image" style="width:24px;">
        </button>
        <input type="file" id="image-upload" accept="image/+" class="hidden">
        <input type="text" id="regionSearch" placeholder="Type the country" autocomplete="off" style="display:none;">
        <div id="regionDropdown"></div>
        <select id="classificationDropdown" style="display: none;"> </select>
    </div>
    
    <div id="ArtworkPreview" style="position: absolute; z-index: 20;">
        <img id="main-image" src="" class="Artwork-Preview" style="position: absolute; display: none;">
    </div>
    <div id="plot">
        <div id="artwork-container" style="position: absolute; top: 0; left: 0; z-index: 20" class="hidden">
        <img id="overlay-artwork" src="" alt="Overlay-Artwork" style="position: absolute; display: none;">
        </div>
    </div>
    <div id="overlay-map"></div>
    

    <div id="label-input" role="dialog" aria-labelledby="Asterism Names" aria-modal="true">
        <label for="english">English Name: </label>
        <input type="text" id="english" placeholder="Insert the translation in English"><br><br>
        <label for="native">Native Name:  </label>
        <input type="text" id="native" placeholder="Insert the native name or the original written"><br><br>
        <label for="pronounce">Pronunciation:</label>
        <input type="text" id="pronounce" placeholder="Insert how to read it"><br><br>
        <label for="ipa">IPA:</label>
        <input type="text" id="ipa" placeholder="Insert the IPA"><br><br>
        <button id="cancel-label">Cancel</button>
        <button id="save-label">Save</button>
    </div>
    
    <!-- Add DSO -->
    <div id="add-dso" role="dialog" aria-labelledby="Add DSO" aria-modal="true">
        <h3>Upload File or Add Object</h3>
        <label>Upload File</label>
        <input type="file" id="dso-file" accept=".csv, .txt"><br>
        <h4>or</h4>
        <h3>Input Manual</h3>
        <h4>Specify the object</h4>
        <div id="dso-input-container">
            <button id="Add-Star-Manual">Stars</button>
            <button id="Add-Planet-Manual">Planet</button>
            <button id="Add-DSO-Manual">Deep Sky Object</button>
        </div><br>
        <div id="manual-input-container"> </div><br>
        <button id="cancel-commonName">Cancel</button>
        <button id="save-commonName">Save</button>               
    </div>

    <!-- The Modal -->
    <div id="myModal" class="modal">
        <div class="modal-content" id="modal-content"></div>
    </div>

    <!-- Asking permission -->
    <div id="askPermission" class="askPermission">
        <div class="askPermission-content">
            <label>
                <input type="checkbox" id="Checkbox"> Don't show it again
            </label>
            <span class="close-permission">&times;</span>
            <h2>Permission Reminder</h2>
            <p>This Star Chart requires pop-up. Please unblock the pop-up display in your setting</p>
            <button id="ok-upload">OK</button>
        </div>
    </div>

    <!-- The Scroll -->
    <div id="myScroll" class="Scroll">
        <div class="scroll-container">
         
            <div class="overlay-text">
                <label>
                    <input type="checkbox" id="optCheckbox"> Don't show it again
                </label>
                <span class="close-papy">&times;</span>
                <h2>Sky Culture Maker</h2>
                <div id="notes">
                    <p><a href="#features">Features</a></p>
                    <p><a href="#map-control">Map Control</a></p>
                </div>
                <img src="icon/starchat-preview.png" class="SCM-preview" id="SCM-preview">
                <ul>
                    <li><a href="#database">Database</a></li>
                    <li><a href="#output">Output</a></li>
                </ul>

                <div id="database">
                    <h4 >Sky Culture Maker creates a database of:</h4>
                    <ul>
                        <li>Name of Culture</li>
                        <li>Names of constellations, stars and other asterisms</li>
                        <li>Stickfigures</li>
                        <li>Convex hull automatically computed</li>
                        <li>Stars within polygon</li>
                        <li>Upload artworks file with the position (anchor) definition</li>
                    </ul>
                </div>

                <div id="features">
                    <h4>Features:</h4>
                    <table border="1" id="table">
                        <tr>
                            <td width="35" align="center"><img src="icon/folder.png" id="iconic"></td>
                            <td>Let the user select a folder from libraries (file explorer) to save the files later. The user could make a new folder or use the existing folder</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/pencil.png"></td>
                            <td>The drawing icon turns off meaning the user could not draw any lines but clicking the stars info</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/pencilactive.png"></td>
                            <td>The drawing icon turns on red meaning the user could draw lines by clicking the stars</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/delete.png"></td>
                            <td>The user must select a desired line to delete it. After the line turns red, the user can click the delete button.</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/input.png"></td>
                            <td>The user must name the asterism first before saving it</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/save-as.png"></td>
                            <td>Saving each asterism</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/submit.png"></td>
                            <td>Saving and downloading all files to the desired folder from <img src="icon/folder.png" id="iconic"></td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/convexhull.png"></td>
                            <td>Turn on and turn off the displayed of the convex hull polygon</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/image.png"></td>
                            <td>Upload artworks file.</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/1902671.png"></td>
                            <td>Giving a brief manual for the working scheme</td>
                        </tr>
                    </table>                
                </div>

                <div id="map-control">
                    <h4>Map Control:</h4>
                    <table border="1" id="table">
                        <tr>
                            <td width="35" align="center"><img src="icon/1.png" id="iconic"></td>
                            <td>Download the plot as a png</td>
                            <td>Take a screenshoot of the star chart</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/2.png"></td>
                            <td>Pan</td>
                            <td>Could drag the star map</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/3.png"></td>
                            <td>Box select</td>
                            <td>Selecting an area in the map into a box</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/4.png"></td>
                            <td>Lasso select</td>
                            <td>Selecting an area in the map with free shape selection</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/5.png"></td>
                            <td>Zoom in</td>
                            <td>Zooming in the star map</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/6.png"></td>
                            <td>Zoom out</td>
                            <td>Zooming out the star map</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/7.png"></td>
                            <td>Reset</td>
                            <td>Reseting the star map from zoom features into the original size</td>
                        </tr>
                        <tr>
                            <td align="center"><img id="iconic" src="icon/8.png"></td>
                            <td>Toggle show closest data on hover</td>
                            <td>(on mode)Display the hover over a star, (off mode) turn off the hover mode</td>
                        </tr>
                    </table>                
                </div>
                
                <div id="output">
                    <h4>Output:</h4>
                    <ul>
                        <li>constellationship.fab : store the list of HIP numbers from the asterisms</li>
                        <li>constellation_names.fab : store the list of asterisms' native and translated name</li>
                        <li>Mid_point.fab : store the list of the center point of the asterisms' and the native names</li>
                        <li>Vertex.fab : store the list of HIP numbers of vertexes or edges of the convex hull</li>
                        <li>Inside.fab : store the list of HIP numbers inside convex hull</li>
                        <li>constellationart.fab : store the images position in pixel and HIP number</li>
                    </ul>                    
                </div>
            <button id="scrollToTop" class="scroll-to-top">
            <img src="icon/up-arrow.png" alt="scroll" style="width:24px; mix-blend-mode: multiply; border: none;">
            </button>
            </div>
            <img src="icon/scroll.png" alt="Scroll" class="scroll-display" id="scroll-display">
        </div>
    </div>    
   
    <aside id="sidebar" class="hidden">
        <span class="close-sidebar">&times;</span>

        <div id="first-sidebar-container" class="hidden">
            <p1 id="information">The image you select must have background "000000" (black) or transparent</p1>
            <br></br>
            <br></br>
            <br></br>
            <p2 id="license">Uploading means you will share it with CC0 or CC BY licence </p2>
        </div>

        <div id="second-sidebar-container" class="hidden">
            <h2>Constellation Artwork</h2>
            <div id="zoom-control">
                <button id="zoom-in" title="zoom in">+</button>
                <button id="zoom-out" title="zoom out">-</button>
                <button id="zoom-reset" title="reset">0</button>
                <button id="replace-button" title="replace">R</button>
                <input type="file" id="replace-image" accept="image/*" class="hidden">
            </div>
            <div id="image-preview-container">
                <div id="image-preview"></div>
            </div>
            <h2>Opacity</h2>
            <div id="controls">
                <input type="range" id="opacity-range" min="0" max="1" value="1" step="0.1">
                <input type="number" id="opacity-number" min="0" max="1" value="1" step="0.1">
                <label for="opacity-range" style="color:white;">Opacity: <span id="opacity-value">1</span></label>
            </div>
            <hr>
            <div id="constellation">
                <h2>Select constellation</h2>
                <select id="constellation-select">
                    <option value="">Select a stickFigure</option>    
                </select>
            </div>
            <hr>
            <div id="pixel-coordinates" class="hidden">
                <h2>Define Image Position</h2>
                <p>You have three points to anchor your image to the map. Select a point (pixel coordinates) in the image preview above, then select a star where this point should be anchored</p>
                <div id="pixcoor-1">
                <h3>point1,star1: <p id="output-1" style="display:inline;"></p> <p id="star-1" style="display:inline;"></p> </h3>
                <button id="editpix-1">Edit</button> <button id="editstar-1">Edit</button>            
                </div>
                <div id="pixcoor-2">
                <h3>point2,star2: <p id="output-2" style="display:inline;"></p> <p id="star-2" style="display:inline;"></p> </h3>
                <button id="editpix-2">Edit</button> <button id="editstar-2">Edit</button>            
                </div>
                <div id="pixcoor-3">
                <h3>point3,star3: <p id="output-3" style="display:inline;"></p> <p id="star-3" style="display:inline;"></p> </h3>
                <button id="editpix-3">Edit</button> <button id="editstar-3">Edit</button>
                </div>
                <br></br>
                <button id="display-image">Display</button>
                <button id="save-coor">Save</button>
                <br></br>            
            </div>
        </div>

    </aside>



    
    <script>
        var lon_array = {lon_array};
        var lat_array = {lat_array};
        var text_array = {text_array};
        var size_array = {size_array};
        var ra_array = {ra_array};
        var mag_array = {mag_array};
        initializePlot(lon_array, lat_array, text_array, size_array, ra_array, mag_array);
    </script>
    </main>
    <footer>
        <hr>
        created for the final assignment <br>
        &copy; copyright reserved <br>
        <a href="mailto:youlaafifahrvvl@gmail.com" style="color:aliceblue;">Azkarrula</a>
    </footer>
</body>
</html>
"""

# Write the HTML content to a file
with open('index.html', 'w') as f:
    f.write(html_content)
