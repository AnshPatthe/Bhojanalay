import BaseRepository from '../../repositories/BaseRepository.js';
import User from '../../models/User.js';

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }

  async findByVerificationToken(token) {
    return this.findOne({ emailVerificationToken: token });
  }

  async findByResetToken(token) {
    return this.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
  }
}

export default new UserRepository();
