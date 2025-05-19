export function timeAgo(dateString: string | Date): string {
	const date = new Date(dateString);
	const now = new Date();
	const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
	const minutes = Math.round(seconds / 60);
	const hours = Math.round(minutes / 60);
	const days = Math.round(hours / 24);
	const months = Math.round(days / 30.4375); // Average days in a month
	const years = Math.round(days / 365.25); // Account for leap years

	if (seconds < 45) {
		return 'a few seconds ago';
	}
	if (seconds < 90) {
		return 'a minute ago';
	}
	if (minutes < 45) {
		return `${minutes} minutes ago`;
	}
	if (minutes < 90) {
		return 'an hour ago';
	}
	if (hours < 22) {
		return `${hours} hours ago`;
	}
	if (hours < 36) {
		return 'a day ago';
	}
	if (days < 25) {
		return `${days} days ago`;
	}
	if (days < 45) {
		return 'a month ago';
	}
	if (months < 11) {
		return `${months} months ago`;
	}
	if (months < 18) {
		return 'a year ago';
	}
	return `${years} years ago`;
}
