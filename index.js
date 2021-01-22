if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}
const express = require('express');
const path = require('path')
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash')
const passport = require('passport');
const localStrategy = require('passport-local');
const MongoDBStore = require("connect-mongo")(session);
const User = require('./Models/user');
const Msg = require('./Models/msg')
const ExpressError = require('./Utils/ExpressError');
const { isLoggedIn } = require('./middleware');
const multer = require('multer')
const { storage } = require('./cloudinary/index');
const upload = multer({ storage });

const app = express();

const dbUrl = process.env.DB_URL;
mongoose.connect(dbUrl, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false })

const db = mongoose.connection;
db.on("error", console.error.bind("connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'));
app.use(flash());
app.use(express.static('public'));

const secret = process.env.SECRET || "thisShouldBeABetterSecret";
const store = new MongoDBStore({
    url: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
})

store.on("error", function (e) {
    console.log("session store error", e);
})

const sessionConfig = {
    store,
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));
app.engine('ejs', ejsMate)
app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.get('/', isLoggedIn, async (req, res) => {
    const userList = await User.find();
    res.render('home', { userList })
})

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome Back');
    const redirectUrl = req.session.returnTo || '/';
    res.redirect(redirectUrl);
})

app.get('/register', (req, res) => {
    res.render('register')
})

app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body
        const user = new User({ email, username });
        const registereduser = await User.register(user, password);
        req.login(registereduser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to YelpCamp');
            res.redirect('/');
        })
    }
    catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
})

app.get('/logout', (req, res) => {
    req.logout();
    req.flash('seccess', 'Good Bye');
    res.redirect('/login')
})

app.get('/:id', async (req, res) => {
    const userList = await User.find();
    const { id } = (req.params);
    const msgs = await Msg.find({ author: { $in: [req.user._id, id] }, friend: { $in: [req.user._id, id] } });
    res.render('chat', { userList, id, msgs })
});

app.post('/:id', upload.array('media'), async (req, res) => {
    const { id } = req.params.id
    const msg = new Msg(req.body.msg);
    msg.file = req.files.map(f => ({ url: f.path, filename: f.filename }));
    msg.author = req.user._id;
    msg.friend = req.body.friend;
    await msg.save();
    req.flash('success', 'Message Successfully Send !');
    res.redirect(`/${req.body.friend}`);
})

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
});

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Something Went Wrong :('
    res.status(statusCode).render('error', { err });
});

const port = 8000; //process.env.PORT || 8080;
app.listen(port, () => {
    console.log('Serving to port 8000');
});