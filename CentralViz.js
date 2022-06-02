// ----------------------------------
/*
Lia Eggleston
Thesis Computer Science 2022

Interactive map given GeoJSON of US states and counties with state-level policy, 
county-level census(+) data, 
as well as community solar site points (NREL)
*/

/* 
Code snippet credits:
-- https://www.visualcinnamon.com/2016/05/smooth-color-legend-d3-svg-gradient/ and https://observablehq.com/@tmcw/d3-scalesequential-continuous-color-legend-example 
-- Irene Ros at https://github.com/iros/patternfills 
*/
// ----------------------------------

// set defaults
var state_var = "max_size";
var county_var = "County_Income2012";
var sites_mode = "location_only"

// Metadata for each graphed var - UPDATE THIS WHENEVER CHANGING DISPLAYED DATA --------

var statevars = ['max_size', 'customer_eligibility', 'li_min_requirement', 'shared_renewables'];
var countyvars = ['County_Income2012', 'Total_damages_pct', 'Avg_Daily_Sunlight_kJ'];
var sitevars = {'SystemSize_kw':null, 'Year_interconnection':null};

// TODO could make these not lists anymore (value is just the colorscale now) 
var variable_metadata = {
	'max_size': [d3.scaleSequential(d3.interpolateBlues).domain([0, 6])],
	'customer_eligibility': [d3.scaleOrdinal().domain(["utility_territory", "county", "other"]).range(["url(#circles-3)", "url(#diagonal-stripe-2)", "white"])],
	'li_min_requirement': [d3.scaleOrdinal().domain(["No", "Yes"]).range(["white", "url(#vertical-stripe-2)"])],
	'shared_renewables': [d3.scaleOrdinal().domain(["No", "Yes"]).range(["white", "url(#crosshatch)"])],
	'Avg_Daily_Sunlight_kJ': [d3.scaleSequential(d3.interpolateOranges)],
	'County_Income2012': [d3.scaleSequential(d3.interpolatePurples)],
	'Total_damages_pct': [d3.scaleSequential(d3.interpolateReds)]
};

const variable_descriptions = {
	'max_size': "Maximum Project Size - Capacity limit (MW) for an individual project to count under this state’s community solar policy.",
	'customer_eligibility': "Customer Eligibility - Limitations on the eligibility of residential customers to subscribe to a project, specifically locational requirements.  Many states only require the subscribers to be in the same utility territory, but some require location in the same county or another specification.",
	'li_min_requirement': "Low-to-Moderate Income (LMI) Stipulations -  Meaningful requirements or adders to address low-to-moderate income household access to community solar projects.",
	'shared_renewables': "Shared renewables policy - The state has a policy or program supporting shared renewables, usually virtual net metering, such that customers can receive bill credits for renewable generation that is not directly connected to their homes.",
	'Avg_Daily_Sunlight_kJ': "Average Daily Sunlight - Daytime solar radiation average in kJ per meter squared, aggregated from 1979 to 2011.  From the CDC’s North American Land Data Assimilation System (NLDAS).",
	'County_Income2012': "County Income - The average per capita income over the selected county, from Hsiang et. al. 2017 and 2012 U.S. Bureau of Economic Analysis values.",
	'Total_damages_pct': "Projected CC Damage - Projected total economic damages due to climate change by 2080 to 2099 RCP8.5 climate pathway, as percent of county income, from Hsiang et. al. 2017."
}

//Width and height, for main map
var w = 1000;
var h = 550;
// for state detail
var w_c = 400;
var h_c = 500;

var state_projections = {"Colorado": [682, 208, 3981]};  //TODO update this default?

// TODO if time refactor these into better than global constants (or fold into sitevars dict to begin w?)
var sizescale = d3.scaleLinear() // For system size in kw
.range([1, 5]);

var sizescale2 = d3.scaleLinear() // For year interconnected
.range([0.5, 7]);

function update_statetext(state) {
	$("#selectedstate").html(state);
}

function setup_main() {

	// ------------------------ Main Map --------------------------------

	//Define map projection
	var projection = d3.geoAlbersUsa()
							.translate([w/2, h/2])
							.scale([w]);

	//Define path generator
	var path = d3.geoPath()
						.projection(projection);

	//Create SVG element
	var svg = d3.select("#mainmap")
		.append("svg")
		.attr("width", w-100)
		.attr("height", h);
	// for state detail
	d3.select("#statemap")
		.append("svg")
		.attr("width", w_c)
		.attr("height", h_c);

	//Number formatting for large values - TODO need this anywhere?
	//var formatAsThousands = d3.format(",");  //e.g. converts 123456 to "123,456"

	//Load in state variables
	d3.csv("state_vars.csv", function(data) {

		//Load in GeoJSON data
		d3.json("us-states.json", function(json) {

			//Merge datasets
			for (var i = 0; i < data.length; i++) {
		
				var state = data[i]['State'];
				var max_size = parseFloat(data[i]['max_size']);	
				var customer_eligibility = data[i]['customer_eligibility'];
				var li_min_requirement = data[i]['li_min_requirement'];
				var shared_renewables = data[i]['shared_renewables'];

				//Find the corresponding state inside the GeoJSON
				for (var j = 0; j < json.features.length; j++) {
				
					var jsonstate = json.features[j].properties.name;

					if (state == jsonstate) {
						//Copy the data value into the JSON
						json.features[j].properties.max_size = max_size;
						json.features[j].properties.customer_eligibility = customer_eligibility;
						json.features[j].properties.li_min_requirement = li_min_requirement;
						json.features[j].properties.shared_renewables = shared_renewables;
						//Stop looking through the JSON
						break;
					}
				}		
			}

			//Bind data and create one path per GeoJSON feature
			svg.selectAll("path.map")
				.data(json.features)
				.enter()
				.append("path")
				.attr("class", "map")
				.attr("d", path)
				.style("stroke", "black")
				.style("stroke-width", "0.5px")
				.style("fill", function(d) {
					//Get data value
					var value = d.properties[state_var];
					
					if (value) {
						//If value exists…
						var color = variable_metadata[state_var][0];
						return color(value);
					} else {
						//If value is undefined…
						if (state_var == 'shared_renewables') {return "white";} // override due to all unknown states understood as "No"
						return "#ccc";
					}
				})
			
			svg.selectAll('path')
				.on('click', function(d) {
					update_statetext(d.properties.name);

					// calculate state projection values
					const bbox = this.getBBox();
					var edge = bbox.width;
					if (bbox.height > bbox.width) {edge = bbox.height;}
					var scalefactor = w*w_c/edge;

					const state_proj = [
						scalefactor/2 - (bbox.x*scalefactor/w), // x translate
						scalefactor/2 - (bbox.y*scalefactor/w) - scalefactor/4.45, // y translate
						scalefactor
					];
					if (!state_projections[d.properties.name]) {state_projections[d.properties.name] = state_proj;}

					//call setup_state_detail with selected state info
					redraw_state();
				});

			// TODO should probably generalize this as well
			if (state_var == "max_size") {max_size_legend(svg);}
			if (state_var == "customer_eligibility") {customer_eligibility_legend(svg);}
			if (state_var == "li_min_requirement") {lir_legend(svg);}
			if (state_var == "shared_renewables") {sr_legend(svg);}

		});

	});	 

	setup_statedetail(); 

	// set up variable descriptions for both maps
	$("#state_var_description").html(variable_descriptions[state_var]);
	$("#county_var_description").html(variable_descriptions[county_var]);

	// update variables and redraw maps when radio buttons are changed
	$('input:radio[name="state_var"]').change(function(){
		state_var = $(this).val();
		$("#state_var_description").html(variable_descriptions[state_var]);
		redraw_main();
    });
	$('input:radio[name="county_var"]').change(function(){
		county_var = $(this).val();
		$("#county_var_description").html(variable_descriptions[county_var]);
		redraw_countyvar();
    });
	$('input:radio[name="site_mode"]').change(function(){
		sites_mode = $(this).val();
		redraw_sites();
    });
	
}

function setup_statedetail() {
	// ------------------------ State Map -------------------------------- 
	// Set country-wide domains for color ranges of county-level vars and site vars; automate min/max of each variable
	d3.json("details_by_state.json", function(data) {
		overall_mins = {};
		overall_maxs = {};
		countyvars.forEach((c) => {
			overall_mins[c] = Infinity;
			overall_maxs[c] = -Infinity;
		})
		Object.entries(sitevars).forEach(([c,v]) => { // TODO - delete all the code to find min/maxes of site vars if you're just using override values
			overall_mins[c] = Infinity;
			overall_maxs[c] = -Infinity;
		})

		Object.entries(data).forEach(([key, value]) => {
			var counties = value[0];
			countyvars.forEach((c) => {
				var c_min = d3.min(counties, function(d) { return d.properties[c]; });
				var c_max = d3.max(counties, function(d) { return d.properties[c]; });
				if (c_min < overall_mins[c]) {overall_mins[c] = c_min;}
				if (c_max > overall_maxs[c]) {overall_maxs[c] = c_max;}
			})

			var sites = value[1];
			if (sites) {
				Object.entries(sitevars).forEach(([s,v]) => {
					var s_min = d3.min(sites, function(d) { return d[s]; });
					var s_max = d3.max(sites, function(d) { return d[s]; });
					if (s_min < overall_mins[s]) {overall_mins[s] = s_min;}
					if (s_max > overall_maxs[s]) {overall_maxs[s] = s_max;}
				})
			}
			
		 });

		countyvars.forEach((c) => {
			variable_metadata[c][0].domain([overall_mins[c], overall_maxs[c]]);
		});
		// Override for Income because it was skewed by high outliers
		variable_metadata['County_Income2012'][0].domain([0, 100000]);
		// Override lower bound for Sunlight because skewed by low outlier (?)
		var domain_upper = variable_metadata['Avg_Daily_Sunlight_kJ'][0].domain()[1];
		variable_metadata['Avg_Daily_Sunlight_kJ'][0].domain([10000, domain_upper]);

		Object.entries(sitevars).forEach(([s,v]) => {
			sitevars[s] = [overall_mins[s], overall_maxs[s]];
		})
		sizescale.domain([0,3000]);
		sizescale2.domain(sitevars['Year_interconnection']);

		redraw_state(); 
		redraw_countyvar();
	});

}

function redraw_main() {
	var svg = d3.select("#mainmap").selectAll("svg");
	//clear legend materials
	svg.selectAll("defs").remove();
	svg.selectAll("rect").remove();
	svg.selectAll(".axis").remove();
	svg.selectAll("text").remove();

	svg.selectAll("path.map")
		.transition()
		.duration(0)
		.style("stroke", "black")
		.style("stroke-width", "0.5px")
		.style("fill", function(d) {
			//Get data value
			var value = d.properties[state_var];
			var color = variable_metadata[state_var][0];
			
			if (value) {
				//If value exists…
				return color(value);
			} else {
				//If value is undefined…
				if (state_var == 'shared_renewables') {return "white";} // override due to all unknown states understood as "No"
				return "#ccc";
			}
		})

	// TODO call appropriate legend drawer
	if (state_var == "max_size") {max_size_legend(svg);}
	if (state_var == "customer_eligibility") {customer_eligibility_legend(svg);}
	if (state_var == "li_min_requirement") {lir_legend(svg);}
	if (state_var == "shared_renewables") {sr_legend(svg);}
}

// Helper functions for custom legends on state-level vars!!
function max_size_legend(svg) {
	svg.append("text")
		.attr("x", 650)
		.attr("y", 12)
		.text("Maximum Size (MW)")
		.attr("font-size", "16px")
		.attr("font-weight", "bold")
		.style("text-anchor", "middle")

	// Legend setup for continuous state variables
	// ----- Code snippet adapted from https://www.visualcinnamon.com/2016/05/smooth-color-legend-d3-svg-gradient/ -----
	var defs = svg.append("defs");
	var linearGradient = defs.append("linearGradient")
		.attr("id", "linear-gradient");
	linearGradient
		.attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%"); // sets the vector for gradient
		
	// use the colors from the continuous variable's color scale
	var colorScale = variable_metadata[state_var][0];
	linearGradient.selectAll("stop")
		.data(colorScale.ticks().map((t, i, n) => ({ offset: `${100*i/n.length}%`, color: colorScale(t) })))
		.enter().append("stop")
		.attr("offset", d => d.offset)
		.attr("stop-color", d => d.color);

	svg.append("rect")
		.attr("x", 500)
		.attr("y", 20)
		.attr("width", 300)
		.attr("height", 20)
		.style("fill", "url(#linear-gradient)")

	// ------------------------------------------------------------------------

	var axisScale = d3.scaleLinear().domain(colorScale.domain()).range([500, 800])
	svg.append("g")
		.attr("class", "axis")
		.attr("id", "mainlegend")
		.attr("transform", "translate(" + 0 + "," + 40 + ")")
		.call(d3.axisBottom()
			.scale(axisScale)
			.ticks(5)); 

	svg.append("text")
		.attr("x", 782)
		.attr("y", 58)
		.text(">")
		.attr("font-size", "15px")

}

function customer_eligibility_legend(svg) {
	svg.append("text")
		.attr("x", 650)
		.attr("y", 12)
		.text("Customer Eligibility Type")
		.attr("font-size", "16px")
		.attr("font-weight", "bold")
		.style("text-anchor", "middle")
	
	r = svg.append("g").attr("id","rectgroup");

	var legend_ce = [[500,20,"utility_territory"],[600,20,"county"],[700,20,"other"]]
	var color = variable_metadata["customer_eligibility"][0];

	// TODO if you can't get this bg fill to work, u may not need those extra rects below (clean up, also in lir_legend)
	r.selectAll("rect")
		.data(legend_ce)
		.enter()
		.append("rect")
		.attr("x", function(d) {return d[0];})
		.attr("y", function(d) {return d[1];})
		.attr("width", 70)
		.attr("height", 20)
		.attr("stroke", "black")
		.attr("stroke-width", "0.5px")
		.attr("fill", function(d) {
			return color(d[2]);
		})

	svg.append("rect")
		.style("fill", "url(#circles-3)")
		.attr("x", legend_ce[0][0])
		.attr("y", legend_ce[0][1])
		.attr("height", 20)
		.attr("width", 70);

	svg.append("rect")
		.style("fill", "url(#diagonal-stripe-2)")
		.attr("x", legend_ce[1][0])
		.attr("y", legend_ce[1][1])
		.attr("height", 20)
		.attr("width", 70);

	svg.append("text")
		.attr("x", legend_ce[0][0]+35)
		.attr("y", legend_ce[0][1]+35)
		.text("Utility Territory")
		.attr("font-size", "15px")
		.style("text-anchor", "middle")

	svg.append("text")
		.attr("x", legend_ce[1][0]+35)
		.attr("y", legend_ce[1][1]+35)
		.text("County")
		.attr("font-size", "15px")
		.style("text-anchor", "middle")

	svg.append("text")
		.attr("x", legend_ce[2][0]+35)
		.attr("y", legend_ce[2][1]+35)
		.text("Other")
		.attr("font-size", "15px")
		.style("text-anchor", "middle")
}

function lir_legend(svg) {

	svg.append("text")
		.attr("x", 700)
		.attr("y", 12)
		.text("Low-Income Requirement?")
		.attr("font-size", "16px")
		.attr("font-weight", "bold")
		.style("text-anchor", "middle")
	
	r = svg.append("g").attr("id","rectgroup");

	var legend_lir = [[600,20,"No"],[700,20,"Yes"]]
	var color = variable_metadata["li_min_requirement"][0];

	r.selectAll("rect")
		.data(legend_lir)
		.enter()
		.append("rect")
		.attr("x", function(d) {return d[0];})
		.attr("y", function(d) {return d[1];})
		.attr("width", 70)
		.attr("height", 20)
		.attr("stroke", "black")
		.attr("stroke-width", "0.5px")
		.attr("fill", function(d) {
			return color(d[2]);
		})

	svg.append("rect")
		.style("fill", "url(#vertical-stripe-2)")
		.attr("x", legend_lir[1][0])
		.attr("y", legend_lir[1][1])
		.attr("height", 20)
		.attr("width", 70);

	svg.append("text")
		.attr("x", legend_lir[0][0]+35)
		.attr("y", legend_lir[0][1]+35)
		.text("No")
		.attr("font-size", "15px")
		.style("text-anchor", "middle")

	svg.append("text")
		.attr("x", legend_lir[1][0]+35)
		.attr("y", legend_lir[1][1]+35)
		.text("Yes")
		.attr("font-size", "15px")
		.style("text-anchor", "middle")
}

function sr_legend(svg) {
	svg.append("text")
		.attr("x", 700)
		.attr("y", 12)
		.text("Shared Renewables Support?")
		.attr("font-size", "16px")
		.attr("font-weight", "bold")
		.style("text-anchor", "middle")

	r = svg.append("g").attr("id","rectgroup");

	var legend_sr = [[600,20,"No"],[700,20,"Yes"]]
	var color = variable_metadata["shared_renewables"][0];

	r.selectAll("rect")
		.data(legend_sr)
		.enter()
		.append("rect")
		.attr("x", function(d) {return d[0];})
		.attr("y", function(d) {return d[1];})
		.attr("width", 70)
		.attr("height", 20)
		.attr("stroke", "black")
		.attr("stroke-width", "0.5px")
		.attr("fill", function(d) {
			return color(d[2]);
		})

	svg.append("rect")
		.style("fill", "url(#crosshatch)")
		.attr("x", legend_sr[1][0])
		.attr("y", legend_sr[1][1])
		.attr("height", 20)
		.attr("width", 70);

	svg.append("text")
		.attr("x", legend_sr[0][0]+35)
		.attr("y", legend_sr[0][1]+35)
		.text("No")
		.attr("font-size", "15px")
		.style("text-anchor", "middle")

	svg.append("text")
		.attr("x", legend_sr[1][0]+35)
		.attr("y", legend_sr[1][1]+35)
		.text("Yes")
		.attr("font-size", "15px")
		.style("text-anchor", "middle")
}


function redraw_state() {
	/* Retrieve data for selected state and redraw but don't change variable/legend */
	selected_state = $("#selectedstate").text();
	state_proj = state_projections[selected_state];

	svg2 = d3.select("#statemap").selectAll("svg");
	//clear #statemap div // TODO make sure it's removing everything but legend!! tooltips etc
	svg2.selectAll("path").remove();
	svg2.selectAll("circle").remove();

	//Define map projection
	var projection2 = d3.geoAlbersUsa()
		.translate([state_proj[0], state_proj[1]])
		.scale([state_proj[2]]);

	//Define path generator
	var path2 = d3.geoPath()
		.projection(projection2);

	//Load in county attribute data
	d3.json("details_by_state.json", function(data) {

		selected_data = data[selected_state]; // data for selected state in format [counties, sites]
		counties = selected_data[0]

		//Bind data and create one path per GeoJSON feature
		svg2.selectAll("path.map")
			.data(counties)
			.enter()
			.append("path")
			.attr("class", "map")
			.attr("d", path2)
			.style("stroke", "black")
			.style("stroke-width", "0.5px")
			.style("fill", function(d) {
				//Get data value
				var value = d.properties[county_var];
				var color = variable_metadata[county_var][0];
				
				if (value == -1) {
					//If value is undefined…
					return "#ccc";
				} else {
					//If value exists…
					return color(value);
				}
		});

		// plot C.S. sites as pts
	
		// TODO find where it's missing a bunch of points in the data...
		a = svg2.append("g").attr("id","sites");
		a.selectAll("circle")
			.data(selected_data[1])
			.enter()
			.append("circle")
			.attr("cx", function(d) {
				return projection2([parseFloat(d.Longitude), parseFloat(d.Latitude)])[0];
			})
			.attr("cy", function(d) {
				return projection2([parseFloat(d.Longitude), parseFloat(d.Latitude)])[1];
			})
			.attr("r", function(d,i) {
				if (sites_mode == 'size') {
					return sizescale(d.SystemSize_kw);
				} else if (sites_mode == 'year') {
					return sizescale2(d.Year_interconnection);
				} else {
					return 3
				}
			})
			.style("fill", "black")
			.style("stroke", "black")
			.style("stroke-width", 1)
			.style("opacity", 0.75)
			.on('mouseover',function(d) {
				var xpos = parseFloat(d3.select(this).attr("cx")) + 20;
				var ypos = parseFloat(d3.select(this).attr("cy")) + 20;;
				svg2.append("rect")
					.attr("id", "tooltip-box")
					.attr("x", xpos)
					.attr("y", ypos)
					.attr("width", 250)
					.attr("height", 100)
					.attr("fill", "white")
					.attr("rx", 10)
					.attr("ry", 10)
					.attr("stroke", "black")
					.attr("opacity", 0.8);

				svg2.append("text")
					.attr("class", "tooltip")
					.attr("x", xpos+15)
					.attr("y", ypos+20)
					.attr("font-size", "14px")
					.text("Project Name: " + d.ProjectName);
				svg2.append("text")
					.attr("class", "tooltip")
					.attr("x", xpos+15)
					.attr("y", ypos+40)
					.attr("font-size", "14px")
					.text("City: "+ d.City);
				svg2.append("text")
					.attr("class", "tooltip")
					.attr("x", xpos+15)
					.attr("y", ypos+60)
					.attr("font-size", "14px")
					.text("System Size (kw-AC): " + (Math.round(d.SystemSize_kw * 100) / 100));
				svg2.append("text")
					.attr("class", "tooltip")
					.attr("x", xpos+15)
					.attr("y", ypos+80)
					.attr("font-size", "14px")
					.text("Year of Interconnection: "+ d.Year_interconnection);
			})
			.on("mouseout", function() {
				svg2.selectAll("text.tooltip").remove();
				svg2.select("#tooltip-box").remove();
			});;
	});
}

function redraw_countyvar() {
	/* Changes variable for the state and legend without re-attaching data */

	svg2 = d3.select("#statemap").selectAll("svg");
	//clear #statemap div of legend materials
	svg2.selectAll("defs").remove();
	svg2.selectAll("rect").remove();
	svg2.selectAll(".axis").remove();
	svg2.selectAll("text").remove();

	svg2.selectAll("path.map")
		.transition()
		.duration(0)
		.style("fill", function(d) {
			//Get data value
			var value = d.properties[county_var];
			var color = variable_metadata[county_var][0];
			
			if (value == -1) {
				//If value is undefined…
				return "#ccc";
			} else {
				//If value exists…
				return color(value);
			}
		})

	// Legend setup for continuous county variables
	// ----- Code snippet adapted from https://www.visualcinnamon.com/2016/05/smooth-color-legend-d3-svg-gradient/ -----
	var defs = svg2.append("defs");
	var linearGradient = defs.append("linearGradient")
		.attr("id", "linear-gradient2");
	linearGradient
		.attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%"); // sets the vector for gradient
	// use the colors from the continuous variable's color scale
	
	var colorScale = variable_metadata[county_var][0];

	linearGradient.selectAll("stop")
		.data(colorScale.ticks().map((t, i, n) => ({ offset: `${100*i/n.length}%`, color: colorScale(t) })))
		.enter().append("stop")
		.attr("offset", d => d.offset)
		.attr("stop-color", d => d.color);

	svg2.append("rect")
		.attr("x", 20)
		.attr("y", 420)
		.attr("width", 300)
		.attr("height", 20)
		.style("fill", "url(#linear-gradient2)");
	// --------------------------------------------------------------------------------------------

	var axisScale = d3.scaleLinear().domain(colorScale.domain()).range([20, 320])
	svg2.append("g")
			.attr("class", "axis")
			.attr("id", "mainlegend")
			.attr("transform", "translate(" + 0 + "," + 440 + ")")
			.call(d3.axisBottom()
				.scale(axisScale)
				.ticks(5));


	// METADATA must be changed if variables change
	const county_labels = {
		'County_Income2012': "County Income 2012 (USD)",
		'Total_damages_pct': "Projected Climate Change Damages (% Income)",
		'Avg_Daily_Sunlight_kJ': "Average Daily Sunlight (kJ/m2), 1979-2011"}
	svg2.append("text")
		.attr("x", 170)
		.attr("y", 480)
		.text(county_labels[county_var])
		.attr("font-size", "16px")
		.attr("font-weight", "bold")
		.style("text-anchor", "middle")
	if (county_var == "County_Income2012") {
		svg2.append("text")
			.attr("x", 291)
			.attr("y", 457)
			.text(">")
			.attr("font-size", "13px")
	}
}

function redraw_sites() {
	svg2 = d3.select("#statemap").selectAll("svg");

	svg2.selectAll("circle")
		.transition()
		.duration(0)
		.attr("r", function(d) {
			if (sites_mode == 'size') {
				return sizescale(d.SystemSize_kw);
			} else if (sites_mode == 'year') {
				return sizescale2(d.Year_interconnection);
			} else {
				return 3
			}
		})
		.style("opacity", function(d) {
			if (sites_mode == 'size' || sites_mode == 'year') {
				return 0.6
			} else {
				return 0.9
			}
		});

}
