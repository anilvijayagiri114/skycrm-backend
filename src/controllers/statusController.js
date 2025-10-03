import Status from '../models/Status.js';
export const listStatuses = async (req, res) => {
  const statuses = await Status.find().sort('order');
  res.json(statuses);
};
