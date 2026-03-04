from flask import Flask, render_template, request, jsonify
import searoute as sr

app = Flask(__name__)

PORTS = [
    # Europe
    {"name": "Rotterdam", "country": "Netherlands", "lat": 51.9225, "lon": 4.4792},
    {"name": "Antwerp", "country": "Belgium", "lat": 51.2213, "lon": 4.4051},
    {"name": "Hamburg", "country": "Germany", "lat": 53.5461, "lon": 9.9661},
    {"name": "Bremerhaven", "country": "Germany", "lat": 53.5396, "lon": 8.5809},
    {"name": "Felixstowe", "country": "United Kingdom", "lat": 51.9582, "lon": 1.3526},
    {"name": "Southampton", "country": "United Kingdom", "lat": 50.9097, "lon": -1.4044},
    {"name": "Liverpool", "country": "United Kingdom", "lat": 53.4084, "lon": -2.9916},
    {"name": "Le Havre", "country": "France", "lat": 49.4944, "lon": 0.1079},
    {"name": "Marseille", "country": "France", "lat": 43.2965, "lon": 5.3698},
    {"name": "Barcelona", "country": "Spain", "lat": 41.3851, "lon": 2.1734},
    {"name": "Valencia", "country": "Spain", "lat": 39.4561, "lon": -0.3240},
    {"name": "Algeciras", "country": "Spain", "lat": 36.1408, "lon": -5.4536},
    {"name": "Genoa", "country": "Italy", "lat": 44.4056, "lon": 8.9463},
    {"name": "Naples", "country": "Italy", "lat": 40.8518, "lon": 14.2681},
    {"name": "Piraeus", "country": "Greece", "lat": 37.9475, "lon": 23.6439},
    {"name": "Istanbul", "country": "Turkey", "lat": 41.0082, "lon": 28.9784},
    {"name": "Mersin", "country": "Turkey", "lat": 36.7981, "lon": 34.6416},
    {"name": "Gothenburg", "country": "Sweden", "lat": 57.7089, "lon": 11.9746},
    {"name": "Copenhagen", "country": "Denmark", "lat": 55.6761, "lon": 12.5683},
    {"name": "Oslo", "country": "Norway", "lat": 59.9139, "lon": 10.7522},
    {"name": "Helsinki", "country": "Finland", "lat": 60.1699, "lon": 24.9384},
    {"name": "St. Petersburg", "country": "Russia", "lat": 59.9311, "lon": 30.3609},
    {"name": "Gdansk", "country": "Poland", "lat": 54.3520, "lon": 18.6466},
    {"name": "Riga", "country": "Latvia", "lat": 56.9460, "lon": 24.1059},
    {"name": "Tallinn", "country": "Estonia", "lat": 59.4370, "lon": 24.7536},
    {"name": "Constanta", "country": "Romania", "lat": 44.1598, "lon": 28.6348},
    {"name": "Limassol", "country": "Cyprus", "lat": 34.6786, "lon": 33.0413},
    # Middle East & Africa
    {"name": "Jebel Ali", "country": "UAE", "lat": 24.9857, "lon": 55.0500},
    {"name": "Port Said", "country": "Egypt", "lat": 31.2565, "lon": 32.2841},
    {"name": "Alexandria", "country": "Egypt", "lat": 31.2001, "lon": 29.9187},
    {"name": "Jeddah", "country": "Saudi Arabia", "lat": 21.5169, "lon": 39.1558},
    {"name": "Aqaba", "country": "Jordan", "lat": 29.5266, "lon": 35.0065},
    {"name": "Haifa", "country": "Israel", "lat": 32.8191, "lon": 34.9983},
    {"name": "Salalah", "country": "Oman", "lat": 16.9329, "lon": 54.0099},
    {"name": "Durban", "country": "South Africa", "lat": -29.8587, "lon": 31.0218},
    {"name": "Cape Town", "country": "South Africa", "lat": -33.9249, "lon": 18.4241},
    {"name": "Lagos", "country": "Nigeria", "lat": 6.4541, "lon": 3.3947},
    {"name": "Mombasa", "country": "Kenya", "lat": -4.0435, "lon": 39.6682},
    {"name": "Dar es Salaam", "country": "Tanzania", "lat": -6.7924, "lon": 39.2083},
    {"name": "Abidjan", "country": "Ivory Coast", "lat": 5.3600, "lon": -4.0083},
    {"name": "Dakar", "country": "Senegal", "lat": 14.7167, "lon": -17.4677},
    {"name": "Tema", "country": "Ghana", "lat": 5.6698, "lon": -0.0166},
    {"name": "Casablanca", "country": "Morocco", "lat": 33.5731, "lon": -7.5898},
    {"name": "Algiers", "country": "Algeria", "lat": 36.7372, "lon": 3.0881},
    # Asia
    {"name": "Shanghai", "country": "China", "lat": 31.2304, "lon": 121.4737},
    {"name": "Ningbo-Zhoushan", "country": "China", "lat": 29.8683, "lon": 121.5440},
    {"name": "Guangzhou", "country": "China", "lat": 23.1291, "lon": 113.2644},
    {"name": "Qingdao", "country": "China", "lat": 36.0671, "lon": 120.3826},
    {"name": "Tianjin", "country": "China", "lat": 39.0000, "lon": 117.7167},
    {"name": "Xiamen", "country": "China", "lat": 24.4798, "lon": 118.0894},
    {"name": "Shenzhen", "country": "China", "lat": 22.5431, "lon": 114.0579},
    {"name": "Hong Kong", "country": "Hong Kong", "lat": 22.3193, "lon": 114.1694},
    {"name": "Singapore", "country": "Singapore", "lat": 1.2644, "lon": 103.8224},
    {"name": "Busan", "country": "South Korea", "lat": 35.0957, "lon": 129.0403},
    {"name": "Kaohsiung", "country": "Taiwan", "lat": 22.6242, "lon": 120.3010},
    {"name": "Tokyo", "country": "Japan", "lat": 35.6585, "lon": 139.7454},
    {"name": "Yokohama", "country": "Japan", "lat": 35.4437, "lon": 139.6380},
    {"name": "Nagoya", "country": "Japan", "lat": 35.1815, "lon": 136.9066},
    {"name": "Osaka", "country": "Japan", "lat": 34.6937, "lon": 135.5023},
    {"name": "Kobe", "country": "Japan", "lat": 34.6901, "lon": 135.1956},
    {"name": "Port Klang", "country": "Malaysia", "lat": 2.9974, "lon": 101.3763},
    {"name": "Tanjung Pelepas", "country": "Malaysia", "lat": 1.3628, "lon": 103.5529},
    {"name": "Laem Chabang", "country": "Thailand", "lat": 13.0877, "lon": 100.8808},
    {"name": "Bangkok", "country": "Thailand", "lat": 13.7563, "lon": 100.5018},
    {"name": "Ho Chi Minh City", "country": "Vietnam", "lat": 10.8231, "lon": 106.6297},
    {"name": "Haiphong", "country": "Vietnam", "lat": 20.8449, "lon": 106.6881},
    {"name": "Manila", "country": "Philippines", "lat": 14.5995, "lon": 120.9842},
    {"name": "Tanjung Priok", "country": "Indonesia", "lat": -6.1235, "lon": 106.8837},
    {"name": "Colombo", "country": "Sri Lanka", "lat": 6.9271, "lon": 79.8612},
    {"name": "Mumbai", "country": "India", "lat": 18.9300, "lon": 72.8347},
    {"name": "JNPT", "country": "India", "lat": 18.9500, "lon": 72.9500},
    {"name": "Chennai", "country": "India", "lat": 13.0827, "lon": 80.2707},
    {"name": "Kolkata", "country": "India", "lat": 22.5726, "lon": 88.3639},
    {"name": "Karachi", "country": "Pakistan", "lat": 24.8607, "lon": 67.0011},
    {"name": "Chittagong", "country": "Bangladesh", "lat": 22.3569, "lon": 91.7832},
    {"name": "Yangon", "country": "Myanmar", "lat": 16.8661, "lon": 96.1951},
    {"name": "Vladivostok", "country": "Russia", "lat": 43.1155, "lon": 131.8855},
    # North America
    {"name": "Los Angeles", "country": "USA", "lat": 33.7295, "lon": -118.2630},
    {"name": "Long Beach", "country": "USA", "lat": 33.7701, "lon": -118.2137},
    {"name": "Seattle", "country": "USA", "lat": 47.6062, "lon": -122.3321},
    {"name": "Tacoma", "country": "USA", "lat": 47.2529, "lon": -122.4443},
    {"name": "New York", "country": "USA", "lat": 40.6501, "lon": -74.0480},
    {"name": "Savannah", "country": "USA", "lat": 32.0809, "lon": -81.0912},
    {"name": "Charleston", "country": "USA", "lat": 32.7765, "lon": -79.9311},
    {"name": "Norfolk", "country": "USA", "lat": 36.8508, "lon": -76.2859},
    {"name": "Baltimore", "country": "USA", "lat": 39.2904, "lon": -76.6122},
    {"name": "Houston", "country": "USA", "lat": 29.7604, "lon": -95.3698},
    {"name": "New Orleans", "country": "USA", "lat": 29.9511, "lon": -90.0715},
    {"name": "Miami", "country": "USA", "lat": 25.7617, "lon": -80.1918},
    {"name": "Honolulu", "country": "USA", "lat": 21.3069, "lon": -157.8583},
    {"name": "Vancouver", "country": "Canada", "lat": 49.2827, "lon": -123.1207},
    {"name": "Prince Rupert", "country": "Canada", "lat": 54.3150, "lon": -130.3208},
    {"name": "Montreal", "country": "Canada", "lat": 45.5017, "lon": -73.5673},
    {"name": "Veracruz", "country": "Mexico", "lat": 19.1738, "lon": -96.1342},
    {"name": "Manzanillo", "country": "Mexico", "lat": 19.0500, "lon": -104.3167},
    # Central & South America
    {"name": "Colon", "country": "Panama", "lat": 9.3697, "lon": -79.9003},
    {"name": "Balboa", "country": "Panama", "lat": 8.9833, "lon": -79.5833},
    {"name": "Cartagena", "country": "Colombia", "lat": 10.3910, "lon": -75.4794},
    {"name": "Callao", "country": "Peru", "lat": -12.0432, "lon": -77.1282},
    {"name": "Santos", "country": "Brazil", "lat": -23.9608, "lon": -46.3333},
    {"name": "Buenos Aires", "country": "Argentina", "lat": -34.6037, "lon": -58.3816},
    {"name": "Paranagua", "country": "Brazil", "lat": -25.5213, "lon": -48.5100},
    {"name": "Kingston", "country": "Jamaica", "lat": 17.9970, "lon": -76.7938},
    # Oceania
    {"name": "Melbourne", "country": "Australia", "lat": -37.8136, "lon": 144.9631},
    {"name": "Sydney", "country": "Australia", "lat": -33.8688, "lon": 151.2093},
    {"name": "Brisbane", "country": "Australia", "lat": -27.4698, "lon": 153.0251},
    {"name": "Fremantle", "country": "Australia", "lat": -32.0569, "lon": 115.7439},
    {"name": "Auckland", "country": "New Zealand", "lat": -36.8485, "lon": 174.7633},
]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/ports")
def search_ports():
    query = request.args.get("q", "").strip().lower()
    if len(query) < 2:
        return jsonify([])
    matches = [
        p for p in PORTS
        if query in p["name"].lower() or query in p["country"].lower()
    ][:10]
    return jsonify(matches)


@app.route("/api/route", methods=["POST"])
def compute_route():
    data = request.get_json()
    origin = data.get("origin")
    destination = data.get("destination")

    if not origin or not destination:
        return jsonify({"error": "Origin and destination are required"}), 400

    try:
        route_naut = sr.searoute(
            [origin["lon"], origin["lat"]],
            [destination["lon"], destination["lat"]],
            units="naut",
            return_passages=True,
        )
        route_km = sr.searoute(
            [origin["lon"], origin["lat"]],
            [destination["lon"], destination["lat"]],
            units="km",
        )

        coords = route_naut["geometry"]["coordinates"]
        leaflet_coords = [[c[1], c[0]] for c in coords]

        dist_naut = round(route_naut.properties["length"], 1)
        dist_km = round(route_km.properties["length"], 1)
        dist_miles = round(dist_naut * 1.15078, 1)
        duration_hours = route_naut.properties.get("duration_hours")
        passages = route_naut.properties.get("passages", [])

        return jsonify({
            "distance_naut": dist_naut,
            "distance_km": dist_km,
            "distance_miles": dist_miles,
            "duration_hours": duration_hours,
            "passages": passages,
            "coordinates": leaflet_coords,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5050))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
