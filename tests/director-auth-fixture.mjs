// Loopback-only test backend. Never deployed as part of the application.
import http from "node:http";
http
  .createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/api/readiness-account") {
      const match = (req.headers.cookie || "").match(/director_qa=(alice|bob)/);
      res.end(
        JSON.stringify(
          match
            ? {
                signedIn: true,
                account: {
                  id: `director-qa-${match[1]}`,
                  email: `${match[1]}@example.invalid`,
                  name: match[1],
                  organisation: "Test organisation",
                },
              }
            : { signedIn: false },
        ),
      );
    } else {
      res.statusCode = 404;
      res.end("{}");
    }
  })
  .listen(4320, "127.0.0.1", () =>
    console.log("Local Director QA identity service ready"),
  );
