const prefixBinder = (req, focus, bannedInjectMembers, prefix, next) => {
	for(let entry of Object.entries(req.body)) {
		let key = entry[0]
		if(bannedInjectMembers.includes(key)) {
			continue
		}
		if(key.indexOf(prefix + '.') != 0) {
			continue
		}
		focus[prefix][key.substring(prefix.length + 1)] = entry[1]
	}
	next()
	
}

module.exports = prefixBinder