//filename and worker
let file = null;
let worker = null;

//go button handler
function handleOnGo(evt)
{
	if (file !== null)
	{
		//params
		let arg_g = +document.getElementById('arg_g').value;
		let arg_t = +document.getElementById('arg_t').value;
		let arg_v = +document.getElementById('arg_v').value;
		let arg_s = +document.getElementById('arg_s').value;
		let arg_z = +document.getElementById('arg_z').value;
		let arg_r = +document.getElementById('arg_r').value;
		let arg_q = +document.getElementById('arg_q').value;
		let arg_d = +document.getElementById('arg_d').value;
		let arg_fr = +document.getElementById('arg_fr').value;
		let arg_xr = +document.getElementById('arg_xr').value;
		let arg_yr = +document.getElementById('arg_yr').value;

		//run pcb solver web worker thread, register output listner
		if (worker !== null) worker.terminate();
		worker = new Worker('worker.js');
		worker.addEventListener('message', function(event)
		{
			if (event.data.length)
			{
				//view the pcb output
				let scale = +document.getElementById('scale').value;
				js_pcb.view_pcb(event.data, scale, 2);
			}
		}, false);

		//post to solver thread
		worker.postMessage([js_pcb.dsn2pcb(file, arg_g),
			 				arg_t, arg_v, arg_s, arg_z, arg_r, arg_q, arg_d, arg_fr, arg_xr, arg_yr]);
	}
}

//file onload handler
function handleOnLoad(evt)
{
	//the onload get a string of the dsn file
	file = evt.target.result;
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

//register action handlers
document.getElementById('files').addEventListener('change', handleFileSelect, false);
document.getElementById('go').onclick = handleOnGo;
