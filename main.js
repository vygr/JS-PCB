//run pcb solver web worker thread, register output listner
let worker = new Worker('worker.js');
worker.addEventListener('message', function(event)
{
	if (event.data.length)
	{
		//view the pcb output
		let scale = document.getElementById('scale').value;
		js_pcb.view_pcb(event.data, scale, 2);
	}
	else
	{
		//finished
		worker.terminate();
		worker = undefined;
	}
}, false);

//file onload handler
function handleOnLoad(evt)
{
	//the onload get a string of the dsn file
	let dsn = evt.target.result;

	//params
	let arg_gap = +document.getElementById('border_gap').value;
	let arg_t = +document.getElementById('t').value;
	let arg_v = +document.getElementById('v').value;
	let arg_s = +document.getElementById('s').value;
	let arg_z = +document.getElementById('z').value;
	let arg_r = +document.getElementById('r').value;
	let arg_q = +document.getElementById('q').value;
	let arg_d = +document.getElementById('d').value;
	let arg_fr = +document.getElementById('fr').value;
	let arg_xr = +document.getElementById('xr').value;
	let arg_yr = +document.getElementById('yr').value;

	//convert to pcb format
	let pcb_data = js_pcb.dsn2pcb(dsn, arg_gap);

	//post to solver thread
	worker.postMessage([pcb_data, arg_t, arg_v, arg_s, arg_z, arg_r, arg_q, arg_d, arg_fr, arg_xr, arg_yr]);
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
