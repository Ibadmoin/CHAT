
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.orignalUrl;
        req.flash('error', 'You must be Signed In first');
        return res.redirect('/login');
    }
    next();
}