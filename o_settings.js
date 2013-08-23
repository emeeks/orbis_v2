// routeQuery = "new_route.php?v="+newSettings.vehicle+"&m="+newSettings.month+"&s="+newSettings.source+"&t="+newSettings.target+"&tc="+newSettings.transfer+"&p="+newSettings.priority+"&ml="+newSettings.modes+"&el="+newSettings.excluded;
routeQuery = "query2.json";

// cartoQuery = "new_carto.php?v="+newSettings.vehicle+"&m="+newSettings.month+"&c="+centerID+"&tc="+newSettings.transfer+"&p="+newSettings.priority+"&ml="+newSettings.modes+"&el="+newSettings.excluded;
cartoQuery = "carto_data.csv";

  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-30365192-1']);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();

