interface LoadingSpinnerProps {
	size?: number
	color?: string
}

export function LoadingSpinner({ size = 16, color = 'var(--color-black)' }: LoadingSpinnerProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			style={{
				animation: 'spin 1s linear infinite'
			}}
		>
			<style>{`
				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
			`}</style>
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke={color}
				strokeWidth="2"
				fill="none"
				strokeDasharray="31.416"
				strokeDashoffset="31.416"
				opacity="0.3"
			/>
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke={color}
				strokeWidth="2"
				fill="none"
				strokeDasharray="31.416"
				strokeDashoffset="15.708"
			>
				<animate
					attributeName="stroke-dasharray"
					dur="1.5s"
					values="0 31.416;15.708 15.708;0 31.416;0 31.416"
					repeatCount="indefinite"
				/>
				<animate
					attributeName="stroke-dashoffset"
					dur="1.5s"
					values="0;-15.708;-31.416;-31.416"
					repeatCount="indefinite"
				/>
			</circle>
		</svg>
	)
}





