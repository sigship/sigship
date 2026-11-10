exports.get = (req, res) => users.findOne({ _id: req.params.id }).then((u) => res.json(u));
