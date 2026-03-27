export default function TaskDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="-my-8"
      style={{
        width: '100vw',
        position: 'relative',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {children}
    </div>
  )
}
