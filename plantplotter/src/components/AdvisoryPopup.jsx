export default function AdvisoryPopup({ gardenId }) {
  // Dummy example logic
  const tips = [
    { type: 'warning', text: 'Tomatoes and potatoes shouldn’t be planted together.' },
    { type: 'tip', text: 'Carrots and onions are great companions!' }
  ];

  return (
    <div className="mt-4">
      {tips.map((tip, idx) => (
        <div
          key={idx}
          className={`p-2 mb-2 rounded ${tip.type === 'warning' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
        >
          {tip.text}
        </div>
      ))}
    </div>
  );
}