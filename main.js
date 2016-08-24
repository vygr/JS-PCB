//file onload handler
function handleOnLoad(evt)
{
	//the onload get a string of the dsn file
	let dsn = evt.target.result;

	//params
	let gap = document.getElementById('border_gap').value;
	let scale = document.getElementById('scale').value;

	let pcb_data = js_pcb.dsn2pcb(dsn, gap);
	js_pcb.view_pcb(pcb_data, scale, 2);
}

//file selection handler
function handleFileSelect(evt)
{
	//filelist
	let files = evt.target.files;
	let f = files[0];

	//dsn files only.
	if (f.name.match('.*[.]dsn'))
	{
		//file reader
		let reader = new FileReader();

		//onload handler
		reader.onload = handleOnLoad;

		//read the dsn file
		reader.readAsText(f);
	}
}

//register file selection handler
document.getElementById('files').addEventListener('change', handleFileSelect, false);

/*
var test = new js_pcb.Layers([100, 100, 2], 1);
test.add_line([0, 0, 0], [100, 100, 0], 1.25, 0.5);
console.log(test.hit_line([0, 0, 0], [100, 100, 0], 1.25, 0.5));
console.log(test.hit_line([0, 10, 0], [90, 100, 0], 1.25, 0.5));
test.sub_line([0, 0, 0], [100, 100, 0], 1.25, 0.5);
console.log(test.hit_line([0, 0, 0], [100, 100, 0], 1.25, 0.5));
*/
