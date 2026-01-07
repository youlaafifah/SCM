import pandas as pd
import json
import os

# Path File
CSV_FILE_PATH = os.path.join('data', 'HIPcat.csv')
JSON_FILE_PATH = os.path.join('data', 'star_data.json')


# Load the CSV file into a DataFrame
df = pd.read_csv(CSV_FILE_PATH)

df['MagV'] = pd.to_numeric(df['MagV'], errors='coerce')
df['RA'] = pd.to_numeric(df['RA'], errors='coerce')
df['Dec'] = pd.to_numeric(df['Dec'], errors='coerce')
print(df.dtypes)

# Apply the Magnitude formula to calculate marker size and invert RA to flip the sky horizontally
#factor = 1
df['Vmag'] = 0.0036 * (1 - (0.13 * df['MagV'])) * 1000 #*factor
df['ARA'] = -df['RA']
#If we zoomed in so the factor = zoom ; zoom 4 = factor 4 or factpr = 1/zoom level

# Generate JavaScript arrays from the DataFrame
data = {
    "lon_array": df['ARA'].tolist(),
    "lat_array": df['Dec'].tolist(),
    "text_array": df['Identifier'].tolist(),
    "size_array": df['Vmag'].tolist(),
    "ra_array": df['RA'].tolist(),
    "mag_array": df['MagV'].tolist(),   
    "starname_array": df['Name'].tolist(),
    "bayername_array": df['Bayer'].tolist(),
    "catHR_array": df['HR'].tolist(),
    "catHD_array": df['HD'].tolist(),
    "IAUcat_array": df['IAUboundary'].tolist()
}

with open(JSON_FILE_PATH, 'w', encoding='utf-8') as json_file:
    json.dump(data, json_file, ensure_ascii=False, indent=4)

print(f"JavaScript arrays have been written to {JSON_FILE_PATH}")