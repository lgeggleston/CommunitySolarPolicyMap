import pandas as pd
import json

path_countiesloc = "Data/gz_2010_us_050_00_5m.json"
path_countyvars = "Data/county_vars_full_hsiang.csv"
path_sunlight = "Data/NLDAS_sunlight.csv"
path_matching = "Data/state_fips.csv"
path_sites = "Data/sharing_the_sun.csv"
path_cities = "Data/uscities.csv"

""" Author: Lia Eggleston
Data Processing for Thesis 2022 """

# TODO: add any error catching/ better interface

match = pd.read_csv(path_matching)


# deal with counties geojson -------------------------

match = pd.read_csv(path_matching)
pd.to_numeric(match["STATE"])
countyjson = None

with open(path_countiesloc, 'r', encoding='latin-1') as f1:
	countyjson = json.load(f1)
	for county in countyjson['features']:
		code = int(county['properties']['STATE'])
		matchrow = match.loc[match['STATE'] == code]
		name = matchrow['STATE_NAME'].values[0]
		# replace fips code with state name
		county['properties']['STATE'] = name
		# replace county fips with full code (concat of state + county)
		county['properties']['COUNTY'] = f'{code:02}' + county['properties']['COUNTY']

# sunlight county var format
sun = pd.read_csv(path_sunlight)
sun.dropna()
sun = sun.loc[:, ['County_FIPS', 'Avg_Daily_Sunlight_kJ']]
pd.to_numeric(sun['Avg_Daily_Sunlight_kJ'])
pd.to_numeric(sun['County_FIPS'])
sun['County_FIPS'] = sun['County_FIPS'].astype('int')	

# deal with other county vars format -------------------------

cv = pd.read_csv(path_countyvars)
cv['State'] = cv.apply(lambda row: match.loc[match['STUSAB'] == row.State]['STATE_NAME'].values[0], axis=1)
pd.to_numeric(cv['County_FIPS'])

# merge sunlight to county vars
cv = pd.merge(cv, sun, how="left", on=["County_FIPS"])
cv = cv.fillna(-1)

cv['County_FIPS'] = cv.apply(lambda row: f'{row.County_FIPS:05}', axis=1) # pad with zeros to match later


# deal with CS sites format  ----------------------------

sites = pd.read_csv(path_sites, encoding='latin-1')
sites['State'] = sites.apply(lambda row: match.loc[match['STUSAB'] == row.State]['STATE_NAME'].values[0], axis=1)

# compile hash table to get county data by state ----------------------------

detail_data_json = {}
for index, row in match.iterrows():
	s = row.STATE_NAME
	# set up space for both county data and CS sites for this state
	detail_data_json[s] = [[], []]

# go through counties
for county in countyjson['features']:
	s = county['properties']['STATE']
	cvars_row = cv.loc[cv['County_FIPS'] == county['properties']['COUNTY']]

	# add vars to json features
	if len(cvars_row) != 0:
		county['properties']['County_Income2012'] = float(cvars_row['County_Income2012'].values[0])
		county['properties']['Energy_expenditure'] = float(cvars_row['Energy_expenditure'].values[0])
		county['properties']['Total_damages_pct'] = float(cvars_row['Total_damages_pct'].values[0])
		county['properties']['Avg_Daily_Sunlight_kJ'] = float(cvars_row['Avg_Daily_Sunlight_kJ'].values[0])

	# add counties to state hash
	detail_data_json[s][0].append(county)


# read and reformat cities data ----
cities = pd.read_csv(path_cities)
cities = cities.loc[:, ['city', 'state_name', 'lat', 'lng', 'population', 'density']]
cities.rename({'city': 'City', 'state_name': 'State', 'lat':'Latitude', 'lng':'Longitude', 'population':'city_population', 'density':'city_density'}, axis=1, inplace=True)

# merge sites with city data (left join) -------
sites_merged = pd.merge(sites, cities, how="left", on=["City", "State"])
sites_merged.dropna(inplace=True)

# add sites by state to detail_data_json

# go through sites
for index, row in sites_merged.iterrows():
	s = row.State
	# add sites to state hash as list of vars
	detail_data_json[s][1].append(row.to_dict())


# write to json
with open('details_by_state.json', 'w') as f:
    f.write(json.dumps(detail_data_json))




