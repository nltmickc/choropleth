#A dashboard based on generated policy data

This is intended to be a demo of dashboarding capabilities and a framework to build on for future projects.

The project makes extensive use of:

* bootstrap
* d3.js
* dc.js
* crossfilter.js
* chroma.js
* keen.io dashboard templates are also used

All external javascript libraries are accessed via CDN - so an active internet connection is needed to run the dashboard. 

Sample data for 100,000 policies is also included in the /static/data directory in compressed format.

# Setup

## Git clone the repo to your workspace.
        
Now run you favourite webserver in the directory 

        workspace/choropleth$ python -m http.server (port_no) --bind 0.0.0.0

### Navigate to http://your_url:port_no/ in a modern browser
