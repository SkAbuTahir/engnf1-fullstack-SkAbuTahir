// Shared toJSON transform: _id -> id, hide __v and passwordHash.
module.exports = {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
};
