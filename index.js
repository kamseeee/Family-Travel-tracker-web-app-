import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "kamsi",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
//  initial array of users on page load
let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];
// function to check number of visited 
async function checkVisisted() {
  const result = await db.query("SELECT country_id, country_code from visited_countries JOIN countries ON countries.id = country_id JOIN users ON users.id = user_id WHERE users.id = $1", [currentUserId]);
  console.log(result.rows)
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
 console.log(countries)
  return countries;
}

async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [currentUserId]);
  const user = result.rows[0];
  return user;
}


app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();
  // console.log(countries)
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color:currentUser.color,
  });
});

// for adding a country to a particular user 
app.post("/add", async (req, res) => {
  const input = req.body["country"];
   const currentUser = await getCurrentUser()
  try {
    const result = await db.query(
      "SELECT id FROM countries WHERE LOWER(country_name) = $1;",
      [input.toLowerCase()]
    );
    

    const data = result.rows[0];
    const countryID = data.id;

    try {
      await db.query(
        "INSERT INTO visited_countries (country_id, user_id) VALUES ($1, $2)",
        [countryID, currentUserId]
      );
      // res.redirect("/") refreshes the page so that latest info from the database can be fetched. Without res.redirect, the page would not refresh, and the user would not see the changes they've just made (e.g., adding a country or switching the user) until they manually reload the page.
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
// when clicking on a particular user 
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});
//  when adding a new user 
app.post("/new", async (req, res) => {
  const noOfUsers = await db.query("SELECT COUNT(*) FROM users");
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (id, name, color) VALUES($1, $2, $3) RETURNING *;",
    [noOfUsers+1, name, color]
  );

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
