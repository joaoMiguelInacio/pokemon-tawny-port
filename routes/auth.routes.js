import express from "express";
const router = express.Router();

import bcrypt from "bcrypt";

import mongoose from "mongoose";

import User from "../models/User.model.js";
import Pokemon from "../models/Pokemon.model.js";

import isLoggedOut from "../middleware/isLoggedOut.js";
import isLoggedIn from "../middleware/isLoggedIn.js";

import uploader from "../config/cloudinary.config.js";

const saltRounds = 10;

router.get("/signup", isLoggedOut, (req, res) => {
  res.render("auth/signup");
});

router.post("/signup", uploader.single('image'), isLoggedOut, async (req, res) => {
  const { name, username, description, password } = req.body;
  if (!req.file) {
    const pokemonID = Math.floor(Math.random() * 151);
    const pokemon = await Pokemon.find( {id:pokemonID});
    const pokemonImg = pokemon[0].sprites.front_animated;
    req.file = {};
    req.file.path = pokemonImg;
  }

  if (!name) {
    return res.status(400).render("auth/signup", {
      errorMessage: "Please provide your name.",
    });
  }
  if (!username) {
    return res.status(400).render("auth/signup", {
      errorMessage: "Please provide your username.",
    });
  }
  if (!description) {
    return res.status(400).render("auth/signup", {
      errorMessage: "What kind of trainer are you?",
    });
  }
  if (password.length < 8) {
    return res.status(400).render("auth/signup", {
      errorMessage: "Your password needs to be at least 8 characters long.",
    });
  }
  User.findOne({ username }).then((found) => {
    if (found) {
      return res
        .status(400)
        .render("auth.signup", { errorMessage: "Username already taken." });
    }
    return bcrypt
      .genSalt(saltRounds)
      .then((salt) => bcrypt.hash(password, salt))
      .then((hashedPassword) => {
        return User.create({
          name,
          username,
          image: req.file.path,
          description,
          password: hashedPassword,
        });
      })
      .then((user) => {
        req.session.user = user;
        req.app.locals.user = req.session.user;
        req.app.locals.inSession = true;
        req.app.locals.anonymous = false;
        res.redirect("/");
      })
      .catch((error) => {
        if (error instanceof mongoose.Error.ValidationError) {
          return res
            .status(400)
            .render("auth/signup", { errorMessage: error.message });
        }
        if (error.code === 11000) {
          return res.status(400).render("auth/signup", {
            errorMessage:
              "Username need to be unique. The username you chose is already in use.",
          });
        }
        return res
          .status(500)
          .render("auth/signup", { errorMessage: error.message });
      });
  });
});

router.get("/login", isLoggedOut, (req, res) => {
  res.render("auth/login");
});

router.post("/login", isLoggedOut, (req, res, next) => {
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).render("auth/login", {
      errorMessage: "Please provide your username.",
    });
  }

  if (password.length < 8) {
    return res.status(400).render("auth/login", {
      errorMessage: "Your password needs to be at least 8 characters long.",
    });
  }

  User.findOne({ username })
    .then((user) => {
      if (!user) {
        return res.status(400).render("auth/login", {
          errorMessage: "Wrong credentials.",
        });
      }

      bcrypt.compare(password, user.password).then((isSamePassword) => {
        if (!isSamePassword) {
          return res.status(400).render("auth/login", {
            errorMessage: "Wrong credentials.",
          });
        }
        req.session.user = user;
        req.app.locals.user = req.session.user;
        req.app.locals.inSession = true;
        req.app.locals.anonymous = false;
        return res.redirect("/");
      });
    })

    .catch((err) => {
      next(err);
    });
});

router.get("/logout", isLoggedIn, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .render("auth/logout", { errorMessage: err.message });
    }
    req.app.locals.inSession = false;
    req.app.locals.anonymous = true;
    res.redirect("/");
  });
});

export default router;
