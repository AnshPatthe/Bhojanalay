export default class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async find(filter = {}, populateOptions = '', select = '', sort = {}) {
    return this.model.find(filter).populate(populateOptions).select(select).sort(sort).exec();
  }

  async findOne(filter = {}, populateOptions = '', select = '') {
    return this.model.findOne(filter).populate(populateOptions).select(select).exec();
  }

  async findById(id, populateOptions = '', select = '') {
    return this.model.findById(id).populate(populateOptions).select(select).exec();
  }

  async create(data) {
    return this.model.create(data);
  }

  async update(id, data, options = { new: true, runValidators: true }) {
    return this.model.findByIdAndUpdate(id, data, options).exec();
  }

  async updateMany(filter, data) {
    return this.model.updateMany(filter, data).exec();
  }

  async delete(id) {
    return this.model.findByIdAndDelete(id).exec();
  }

  async deleteMany(filter) {
    return this.model.deleteMany(filter).exec();
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter).exec();
  }
}
