let vals = [];
let dates = [];
let sliderVal = 1655352000; //initialize sliderVal
let output = document.getElementById("output");
let button = document.getElementById("myButton");

// Add an event listener to the button



d3.json("ct-towns-2022-simple-datactgov.geojson").then((geojson,err1)=> {
    d3.dsv(",","covid_imp.csv",(d)=>{
        return{ date:  d.date, name: d.city, case: +d.case, death: +d.death, rate: +d.rate};
    }).then((data,err2)=>{
        console.log(data);
        let slider = document.getElementById("myRange");
        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function() {
            sliderVal = this.value;
            console.log(sliderVal);
            console.log(findClosest(dates, sliderVal));
        }

        //Finds the closest value in 'array' to 'target'
        function findClosest(array, target) {
            let res = array[0];
            for (let i = 1; i < array.length; i++) {

                // update the result if we find a closer element.
                if (Math.abs(array[i] - target) <= Math.abs(res - target)) {
                    res = array[i];
                }
            }
            return res;
        }

        //separating data values from main array
        for (let j = 0; j < data.length; j++) {
            ///vals.push(data[j]["case"]);
            if (data[j+1]["date"] !== data[j]["date"])
            {
                dates.push(data[j]["date"]);
            }
        }

        //basic logic flow: if the date is the one given by slider, assign corresponding case value.
        function assignData() {
            console.log("Running");
            for (let i = 0; i < geojson.features.length; i++) {
                for (let j = 0; j < data.length; j++) {
                    if (data[j]["date"] == ) {
                        console.log("date found");
                        if (geojson.features[i].properties["name"] === data[j]["name"]) {
                            geojson.features[i].properties["val"] = data[j]["case"];
                        }
                    }
                    if (j == 0){
                        vals.push(data[j]["case"]);
                    }
                }
            }
            console.log("Done");
        }
        console.log(vals);
        console.log(dates);
        let max = d3.max(vals);
        let min = d3.min(vals);
        let mid = min + (max-min)/2;
        console.log(max);
        console.log(min);
        console.log(mid);

        let continuousColor = d3.scaleLinear([min,max],[0,1.0]); //continuous version
        let colorScale = d3.interpolateHsl(d3.hsl(120,1,0.5),d3.hsl(0,1.0,0.5)); //1 = green, 0 = red

        function discreteColor(value)
        {
            if (value >= mid){
                return 1;
            }
            else{
                return 0;
            }
        }


        let map = L.map('map').setView([41.38016733657364, -72.10705729845692], 8); //new leaflet map
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);


        function townStyle(feature){
            return {
                "color": colorScale(continuousColor(feature.properties["val"])), //use colormap or colorscale
                "weight": 1
            }
        }

        function onEachFeature(feature, layer){
            if (feature.properties && feature.properties.val) {
                layer.bindPopup("Case number in " + feature.properties.name + ": " + feature.properties.val.toLocaleString('en-US')); //It doesn't work without the empty string?
            }
        }

        let geoJsonLayer = L.geoJSON(geojson,{style:townStyle, onEachFeature:onEachFeature}).addTo(map);

        document.getElementById("resetButton").addEventListener("click", assignData);
        document.getElementById("resetButton").addEventListener("click", function () {geoJsonLayer.resetStyle(this);});
    });
});