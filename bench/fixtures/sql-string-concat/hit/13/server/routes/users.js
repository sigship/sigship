exports.remove = (req, res) => db.query(`DELETE FROM posts WHERE id = ${req.params.id}`).then(() => res.sendStatus(204));
