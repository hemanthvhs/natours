const Tour = require('./tourModel');
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Setting the schema options for virtuals importance
// As we know virtuals are never persisted in DB. We make some calculations based on the
// other fields & inorder to show them in output or resposne then we need to set
// the schema options as mentioned above

// QUERY MIDDLEWARE - FOR PARENT REFERENCING TOURS & USERS

reviewSchema.pre(/^find/, function (next) {
  // this refers to the query
  this.populate([
    //{ path: 'tour', select: 'name' },
    { path: 'user', select: '-__v' },
  ]);
  next();
});

// STATIC METHODS
// Our ultimate aim is to update the Tours ratings & ratings average based on the
// number of reviews for that particular tour & average ratings for that particular tour
// Whenever new review is created, this statics method is called & will fins the number of ratings & average & updates the tour document of ratings & average ratings
reviewSchema.statics.calcRatingsAverage = async function (tourID) {
  // this refers to the model. Aggregate is performed on model only
  const stats = this.aggregate([
    { $match: { tour: tourID } },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  await Tour.findByIdAndUpdate(tourID, {
    ratingsQuantity: stats[0].nRatings,
    ratingsAverage: stats[0].avgRating,
  });
};

reviewSchema.post('save', function () {
  // We are calling our static function calcRatingsAverage
  // this refers to the persisted db document & this.tour is the tourID
  this.constructor.calcRatingsAverage(this.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
