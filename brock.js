
const jsdom = require('jsdom');
const mqtt = require('mqtt');

const brock_url = "https://nationalhighways.co.uk/travel-updates/operation-brock/";
const tap_url = "https://www.kenttraffic.info/tw2.php";

const mqtt_host = "mqtt://192.168.0.151";
const mqtt_opts = {
    topic: "m20brock"
};

void (async () => {

    let brock_html;
    await fetch(brock_url).then(function (response) {
        // The API call was successful!
        return response.text();
    }).then(function (data) {
        // This is the JSON from our response
        brock_html = data;
    }).catch(function (err) {
        // There was an error
        console.warn('Something went wrong.', err);
    });

    // console.log(brock_html);
    let brock_doc = new jsdom.JSDOM(brock_html);

    let sss = brock_doc.window.document.getElementsByClassName('alert');
    // console.log(sss);
    let short_text = '', full_text = [];
    for (t of sss) {
        // console.log(t);
        t1 = t.textContent.trim();
        if (t1.length > 0) {
            if (short_text.length == 0)
                short_text = t1;
            full_text.push(t1);
        }
    };
    console.log(`Short text: ${short_text}`);
    console.log(`Long Text: ${full_text.join('\n*')}`);

    let client = mqtt.connect(mqtt_host, mqtt_opts);

    client.on("connect", () => {
        client.publish("m20brock", JSON.stringify({
            short_text: short_text
        }), {retain: true});
        client.end();
    });

    let tap_json;

    await fetch(tap_url).then(function (response) {
        // The API call was successful!
        return response.json();
    }).then(function (data) {
        // This is the JSON from our response
        tap_json = data;
    }).catch(function (err) {
        // There was an error
        console.warn('Something went wrong getting Dover TAP status.', err);
    });
    // console.log(`TAP: ${JSON.stringify(tap_json)}`);

    short_text = ""; full_text = "";
    tap_json.members.forEach(element => {
        let t = element.tick_text.replace(/<[^>]*>?/gm,"");
        // console.log(`element: ${JSON.stringify(t)}`);
        if(t.startsWith("Dover Tap:")) {
            short_text = "Dover TAP is in operation";
            full_text = t;
        }
    });
    if(full_text.length == 0) {
        console.log("No TAP Info found")
        short_text = "Dover TAP is not in operation";
        full_text = "Not in operation";
    }
    console.log(`Short text: ${short_text}`);
    console.log(`Long Text: ${full_text}`);

    client = mqtt.connect(mqtt_host, mqtt_opts);
    client.on("connect", () => {
        client.publish("a20tap", JSON.stringify({
            short_text: short_text,
            long_text: full_text
        }), {retain: true});
        client.end();
    });
    
})();
