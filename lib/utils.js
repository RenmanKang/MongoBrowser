var util = require('util');

exports.endsWith = function(str, suffix) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

exports.convertBytes = function(input) {
	input = parseInt(input, 10);
	if (input < 1024) {
		return input.toString() + ' Bytes';
	} else if (input < 1024 * 1024) {
		//Convert to KB and keep 2 decimal values
		input = Math.round((input / 1024) * 100) / 100;
		return input.toString() + ' KB';
	} else if (input < 1024 * 1024 * 1024) {
		input = Math.round((input / (1024 * 1024)) * 100) / 100;
		return input.toString() + ' MB';
	} else {
		return input.toString() + ' Bytes';
	}
};

exports.getErrMsg = function(err) {
	var err_msg = err;
	if((err instanceof Error) && err.stack) {
		err_msg = util.format(err) + '\n' + err.stack;
	}
	return err_msg;
};

exports.getFileName = function(fullPath) {
	if(fullPath) {
		var arr = fullPath.split('/');
		var len = arr.length;
		var off = len < 2 ? 0: len - 2;
		return arr.slice(off).join('/');
	} else {
		return fullPath;
	}
};
