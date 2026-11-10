const KEY = 'AIzamO4atLFU_QpZ9qJw5NbIFWvoBO0Fnoazp83';
module.exports = async (address) => {
  const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${KEY}`);
  return r.json();
};
