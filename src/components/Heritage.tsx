import React from "react";
export function HeritageRibbon() {
  const flags = [
    ["cv", "Cape Verde"],
    ["ms", "Montserrat"],
    ["jm", "Jamaica"],
    ["tt", "Trinidad and Tobago"],
    ["pr", "Puerto Rico"],
    ["bb", "Barbados"],
    ["lc", "Saint Lucia"],
    ["gd", "Grenada"],
    ["dm", "Dominica"],
    ["ag", "Antigua and Barbuda"],
    ["kn", "Saint Kitts and Nevis"],
    ["vc", "Saint Vincent and the Grenadines"],
    ["bs", "Bahamas"],
    ["cu", "Cuba"],
    ["do", "Dominican Republic"],
    ["ht", "Haiti"],
  ];
  return (
    <>
      <div className="stripe" aria-hidden="true" />
      <div
        className="flag-ribbon"
        role="region"
        tabIndex={0}
        aria-label="Island heritage flags"
      >
        <span className="flag-home-label">
          Our roots: Cape Verde & Montserrat
        </span>
        {flags.map(([id, name], index) => (
          <img
            key={id}
            className={"flag" + (index < 2 ? " flag-home" : "")}
            src={"/images/flags/" + id + ".svg"}
            alt={name}
            title={name}
            width={index < 2 ? 48 : 36}
            height={index < 2 ? 32 : 24}
          />
        ))}
      </div>
    </>
  );
}
export function Palm({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 200 320" aria-hidden="true">
      <path
        d="M96 320 C 92 250, 90 190, 108 118"
        stroke="currentColor"
        strokeWidth="11"
        fill="none"
        strokeLinecap="round"
      />
      <g fill="currentColor">
        {[
          "M108 118 C 72 86, 30 88, 2 124 C 38 104, 76 104, 108 118 Z",
          "M108 118 C 86 70, 50 50, 14 58 C 52 70, 82 90, 108 118 Z",
          "M108 118 C 112 70, 140 40, 176 34 C 146 56, 124 84, 108 118 Z",
          "M108 118 C 146 92, 184 98, 200 130 C 170 112, 138 110, 108 118 Z",
          "M108 118 C 140 124, 166 150, 172 186 C 152 156, 130 138, 108 118 Z",
          "M108 118 C 84 130, 64 156, 60 190 C 78 160, 94 140, 108 118 Z",
        ].map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
export function TropicalDecor() {
  return (
    <>
      <div className="sun" aria-hidden="true" />
      <Palm className="palm palm-big" />
      <Palm className="palm palm-small" />
      <div className="sea" aria-hidden="true">
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none">
          <path
            d="M0 45 C 120 5, 240 85, 360 45 S 600 5, 720 45 S 960 85, 1080 45 S 1320 5, 1440 45 V90 H0 Z"
            fill="#1FA7A5"
          />
        </svg>
        <div className="sea-body" />
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path
            d="M0 40 C 160 0, 320 70, 480 36 S 800 0, 960 38 S 1280 70, 1440 30 V80 H0 Z"
            fill="#FBF1DC"
          />
        </svg>
      </div>
    </>
  );
}
export function FlavorStrip() {
  return (
    <div className="banner-strip" aria-hidden="true">
      {[
        ["JERK CHICKEN", "red"],
        ["RICE & PEAS", "gold"],
        ["FRIED PLANTAINS", "green"],
        ["GRILLED SHRIMP", "teal"],
        ["ISLAND SALMON", "red"],
        ["FRIED CABBAGE", "gold"],
      ].map(([name, color], i) => (
        <span
          key={name}
          className={"tag " + color + (i % 2 ? " tilt-r" : " tilt-l")}
        >
          {name}
        </span>
      ))}
    </div>
  );
}
export function Community() {
  return (
    <>
      <section className="mission" id="mission">
        <Palm className="palm-deco-red" />
        <div>
          <span className="tag gold tilt-l">OUR MISSION</span>
          <h2>Every plate helps send a kid to school.</h2>
        </div>
        <div className="mission-copy">
          <p>
            Island Taste is a DBA of Polaris Village Ministries. We cook to
            raise scholarship funds for <b>Polaris Village Academy</b> and{" "}
            <b>Polaris Village Early Learning Center</b>, so your lunch is also
            a donation.
          </p>
          <div className="actions">
            <a
              className="btn btn-white"
              href="http://www.polarisvillageacademy.org"
            >
              Meet our scholars
            </a>
            <a
              className="btn btn-outline-light"
              href="https://www.facebook.com/search/top?q=polaris%20village%20academy"
            >
              Academy on Facebook
            </a>
          </div>
        </div>
      </section>
      <section className="visit" id="visit">
        <div>
          <span className="tag green tilt-l">COME THROUGH</span>
          <h2 className="big teal-text">Find us on Port Street.</h2>
          <div className="info">
            <div>
              <strong>ADDRESS</strong>
              <span>
                209 Port Street
                <br />
                Easton, MD 21601
              </span>
            </div>
            <div>
              <strong>PUBLISHED HOURS</strong>
              <span>
                Tuesday–Friday
                <br />
                11:30 AM–4:00 PM Eastern
              </span>
            </div>
            <div>
              <strong>CALL</strong>
              <a href="tel:4107149033">(410) 714-9033</a>
            </div>
            <div>
              <strong>PICKUP</strong>
              <span>At Polaris Village Ministries</span>
            </div>
          </div>
          <div className="actions">
            <a
              className="btn btn-teal"
              href="https://www.google.com/maps/search/?api=1&query=209+Port+St+Easton+MD+21601"
            >
              Get directions
            </a>
            <a className="btn btn-outline-teal" href="tel:4107149033">
              Call to order
            </a>
          </div>
        </div>
        <div className="map">
          <iframe
            title="Map to Island Taste, 209 Port Street, Easton MD"
            loading="lazy"
            src="https://www.google.com/maps?q=209+Port+St,+Easton,+MD+21601&output=embed"
          />
          <div className="map-address"><strong>Your island in Easton.</strong><p>209 Port Street<br/>Easton, Maryland 21601</p><a href="https://www.google.com/maps/search/?api=1&query=209+Port+St+Easton+MD+21601">Open in Google Maps →</a></div>
        </div>
      </section>
    </>
  );
}
export function FooterWave() {
  return (
    <svg
      className="footer-wave"
      viewBox="0 0 1440 70"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 40 C 160 0, 320 70, 480 36 S 800 0, 960 38 S 1280 70, 1440 30 V70 H0 Z"
        fill="#0B5C6B"
      />
    </svg>
  );
}
