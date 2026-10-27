<script lang="ts">
	import { Input } from '$lib/components/ui/input';

	let {
		value = $bindable(),
		class: className = '',
		placeholder = '',
		type = 'text',
		disabled = false,
		required = false,
		id = undefined,
		name = undefined,
		readonly = false,
		...restProps
	}: {
		value?: string | null;
		class?: string;
		placeholder?: string;
		type?: string;
		disabled?: boolean;
		required?: boolean;
		id?: string;
		name?: string;
		readonly?: boolean;
		[key: string]: any;
	} = $props();

	function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
		const val = e.currentTarget.value.toUpperCase();
		value = val;
		e.currentTarget.value = val;
	}
</script>

<Input
	{type}
	{id}
	{name}
	{placeholder}
	{disabled}
	{required}
	{readonly}
	bind:value
	oninput={handleInput}
	class="uppercase {className}"
	{...restProps}
/>
