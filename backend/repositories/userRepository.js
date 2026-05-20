/* ═══════════════════════════════════════════════════
   repositories/userRepository.js
   Шар доступу до даних — інкапсулює всі запити
   до колекції users. Контролери не звертаються
   до MongoDB напряму.
═══════════════════════════════════════════════════ */

const { User } = require('../models');

const UserRepository = {
  findById: (id) =>
    User.findById(id),

  findByNickname: (nickname) =>
    User.findOne({ nickname: nickname.trim() }),

  findByNicknameExcept: (nickname, excludeId) =>
    User.findOne({ nickname: nickname.trim(), _id: { $ne: excludeId } }),

  create: (data) =>
    User.create(data),

  updateById: (id, update) =>
    User.updateOne({ _id: id }, { $set: update }),

  incrementStat: (id, field) =>
    User.findByIdAndUpdate(id, { $inc: { [field]: 1 } }),

  addXpAndCoins: (id, xp, coins) =>
    User.findByIdAndUpdate(id, { $inc: { xp, coins } }, { new: true }),

  addFrame: (id, frameId, price) =>
    User.updateOne({ _id: id }, { $inc: { coins: -price }, $push: { ownedFrames: frameId } }),

  setActiveFrame: (id, frameId) =>
    User.updateOne({ _id: id }, { $set: { activeFrame: frameId } }),

  searchByNickname: (query, excludeId) =>
    User.find({ _id: { $ne: excludeId }, nickname: { $regex: query, $options: 'i' } }).limit(10),

  findWithFollowing: (id) =>
    User.findById(id).populate('following', 'nickname avatar xp level activeFrame ownedFrames'),

  addFollowing: (myId, targetId) =>
    Promise.all([
      User.updateOne({ _id: myId     }, { $addToSet: { following: targetId } }),
      User.updateOne({ _id: targetId }, { $addToSet: { followers: myId     } }),
    ]),

  removeFollowing: (myId, targetObjectId, targetId, myObjectId) =>
    Promise.all([
      User.updateOne({ _id: myId     }, { $pull: { following: targetObjectId } }),
      User.updateOne({ _id: targetId }, { $pull: { followers: myObjectId     } }),
    ]),

  isFollowing: (me, targetId) =>
    (me.following || []).some(id => String(id) === String(targetId)),
};

module.exports = UserRepository;
