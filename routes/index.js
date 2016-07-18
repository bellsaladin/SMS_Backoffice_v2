var babelify = require('babelify');
var browserify = require('browserify-middleware');
var keystone = require('keystone');

var clientConfig = {
	commonPackages: [
		'elemental',
		'react',
		'react-addons-css-transition-group',
		'react-dom',
		'store-prototype',
		'xhr',
	],
};

// Setup Route Bindings
exports = module.exports = function (app) {

	// Bundle commonw packages
	app.get('/js/packages.js', browserify(clientConfig.commonPackages, {
		cache: true,
		precompile: true,
	}));

	// Serve script bundles
	app.use('/js', browserify('./client/scripts', {
		external: clientConfig.commonPackages,
		transform: [babelify.configure({
			plugins: [require('babel-plugin-transform-object-rest-spread'), require('babel-plugin-transform-object-assign')],
			presets: [require('babel-preset-es2015'), require('babel-preset-react')],
		})],
	}));

	// Views
	app.get('/api', function (req, res) {
		res.render('api', {
			Keystone: {
				csrf_header_key: keystone.security.csrf.CSRF_HEADER_KEY,
				csrf_token_value: keystone.security.csrf.getToken(req, res),
			},
		});
	});

	app.get('/sms-app/verifyAccess', function(req, res){
		var p_username = req.query.username;
		var p_password = req.query.pw;
		var p_macAddress = req.query.mac;
		var p_version = req.query.version;
		var p_nbrSmsSent = req.query.varnbrsms;
		var p_dateLastOperation = req.query.vardateop;

    var msg = "";
    var code = 0;
    var APP_VERSION = '1.2'; // gathered from the database
    var soldeSMS = 0;

		keystone.mongoose.model('Customer').findOne({ 'username': p_username, 'password' : p_password },
																							 /*'username password name macAddress soldeSMS isBloqued blockReason',*/
																							 function (err, customer) {
			if (err) return handleError(err);
			console.log('%s', customer) // Space Ghost is a talk show host.
			if(!customer){
				code = 0;
				msg = "Le nom d'utilisateur ou le mot de passe est incorrect !";
			}
			else if(APP_VERSION != p_version ){
	      code = -3;
	      msg = "Votre application n'est pas à jour, veuillez telecharger la nouvelle version via le lien suivant : http://sms-app.sgimaroc.com/download";
	    }
			else if(customer.macAddress && p_macAddress != customer.macAddress){
				code = -2;
				msg = "La machine sur laquelle l'application est executée n'est pas autorisée.";
			}else if(customer.isBlocked){
				code = -1;
				msg = "Le compte utilisé est bloqué. Veuillez nous contacter sur le numéro : 00000000000.";
			}else if(customer.demoUseOnly){
				code = 2;
	      msg = "L'application fonctionnera en mode de démonstration.";
				soldeSMS = customer.soldeSMS;
			}else if(!customer.isBlocked){
				code = 1;
				msg = 'Connexion autorisée';
				soldeSMS = customer.soldeSMS;
				// if the mac address is not yet captured
				if(!customer.macAddress){
						customer.macAddress = p_macAddress;
						customer.save(function (err) {
					    if (err) return handleError(err);
					    //res.send(customer);
							console.log('Customer saved ! %s', customer)
					  });
				}
			}
			//keystone.mongoose.model('CustomerActivity').save()
			var CustomerActivityList = keystone.list('CustomerActivity');
			var customerActivity = new CustomerActivityList.model();

			customerActivity.customer        = customer;
			customerActivity.operationDate   = p_dateLastOperation;
			customerActivity.numberOfSentSMS = p_nbrSmsSent;
			customerActivity.save(function (err) {
				if (err) {
					console.error('Error adding customer activity to the database');
					console.error(err);
				} else {
					console.log('Saved \'Customer activity\' to the database');
				}
			});

			res.send(code + '|||' + msg + '|||' + soldeSMS);
		});

    /*if(APP_VERSION != req.query.version ){
      code = -3;
      msg = "Votre application n'est pas à jour, veuillez telecharger la nouvelle version via le lien suivant : http://sms-app.sgimaroc.com/login";
    }
    else if(req.query.username == 'administrateur' && req.query.pw == '123456' && authorizedMac()){
      //code = 1;
      msg = 'Connexion autorisée';
    }
    else if(req.query.username == 'administrateur' && req.query.pw == '123456' && !authorizedMac()){
      code = -2;
      msg = "La machine sur laquelle l'application est executée n'est pas autorisée.";
    }
    else if(req.query.username == 'administrateur' && req.query.pw == '123456' && bloquedAccess()){
      code = -1;
      msg = "Le compte utilisé est bloqué. Veuillez nous contacter sur le numéro : 00000000000.";
    }
    else if(req.query.username == 'administrateur' && req.query.pw == '123456' && demoAccess()){
      code = 2;
      msg = "L'application fonctionnera en mode de démonstration.";
    }
    else{
      code = 0;
      msg = "Le nom d'utilisateur ou le mot de passe est incorrect !";
    }
    soldeSMS = 5000;
    res.send(code + '|||' + msg + '|||' + soldeSMS);*/
	});

	// Views
	app.use(function (req, res) {
		res.render('index');
	});

};

function authorizedMac(){
	return true;
}

function bloquedAccess(){
	return false;
}
function demoAccess(){
	return false;
}
