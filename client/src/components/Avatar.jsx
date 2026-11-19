export default function Avatar({ user, size = 42 }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };

  if (user.avatar) {
    return (
      <img className="avatar" src={user.avatar} alt={user.username} style={style} />
    );
  }

  return (
    <div className="avatar" style={style}>
      {user.username[0].toUpperCase()}
    </div>
  );
}