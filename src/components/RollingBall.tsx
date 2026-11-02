/** كورة تتدحرج وتنط على أرض الهيرو (تزخرف فقط، ومخفية عن قارئات الشاشة) */
export function RollingBall() {
  return (
    <div className="ball-lane" aria-hidden="true">
      <div className="ball-x">
        <div className="ball-y">
          <img src={`${import.meta.env.BASE_URL}ball.png`} alt="" width={72} height={72} />
        </div>
        <div className="ball-shadow" />
      </div>
    </div>
  );
}
