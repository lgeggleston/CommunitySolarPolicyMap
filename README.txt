Community Solar Policy Map: Interactive Visualization of U.S. Sites and Policies
Lia Eggleston
Adviser: Dr. Holly Rushmeier

This project utilizes the D3.js library in Javascript, as well as the Python pandas library, to visualize data about U.S. community solar sites and policies in a user-friendly, interactive map. Community solar refers to local, generally small-scale installations of photovoltaics, which multiple community members either co-own or subscribe to, receiving credit for power generated from a site connected to the grid. There are also key components of community solar legislation that vary across regions, such as a maximum project size, the eligibility of customers to subscribe, or a requirement for low-income subscribers. The goal of the project is to present information on complex renewable energy policies in an innovative way, and to promote user exploration of the broad impacts of those policies. This is achieved through a set of two choropleth maps, one showing state level data and the other showing details-on-demand for an individual state. The visualization allows users to toggle between layers for each choropleth, and gives descriptions of the variables shown as well as user instructions to facilitate navigation.

This map represents the state-level policies available as of May 2022, with intention for future updates.

Data Sources:

County, City, and Site-Level
➢ GeoJSONs for U.S. county outlines were compiled by Eric Celeste, with additional credit to the U.S. Census Bureau. https://eric.clst.org/tech/usgeojson/ 
➢ County Income and projected climate change damages came from Hsiang et. al. 2017. https://www.science.org/doi/full/10.1126/science.aal4369
➢ Average daily sunlight data were from the CDC’s North America Land Data Assimilation
System (NLDAS). https://wonder.cdc.gov/nasa-insolar.html
➢ City location data, population, and density were from Simplemaps U.S. Cities Database. https://simplemaps.com/data/us-cities   
➢ State FIPS codes came from the U.S. Census Bureau. https://www2.census.gov/geo/docs/reference/state.txt
➢ The sites used were the NREL Sharing the Sun Community Solar Project Data, of
December 2020. https://data.nrel.gov/submissions/167

State-Level
➢ Several sources from the National Renewable Energy Laboratory (NREL), including
	○ A 2016 blog post overviewing state and local policies. https://www.nrel.gov/state-local-tribal/blog/posts/understanding-some-key-differences-in-comm unity-solar-policy-across-the-states.html#_edn5
	○ The 2018 “Focusing the Sun” report on state considerations for designing
community solar policy. https://www.nrel.gov/docs/fy18osti/70663.pdf 
	○ A 2020 report on updates and capacity growth potential for states. https://www.nrel.gov/docs/fy21osti/78174.pdf
➢ The Institute for Local Self-Reliance (ILSR) Community Power Map. https://ilsr.org/community-power-map/
➢ Shared Renewables’ Community Energy Projects database of state legislation.  https://www.sharedrenewables.org/community-energy-projects/


In this directory:
-index.html is the main site
-CentralViz.js contains the d3.js code for the visualization
-details_by_state.json and state_vars.csv contained pre-processed data
-data_preparation.py was used for said data processing

Contact:
egglestonlia@gmail.com
