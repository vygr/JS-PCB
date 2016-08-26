importScripts('mymath.js', 'layer.js', 'router.js');

function pcb_thread(paramater_array)
{
	//generate range of routing vectors
	function gen_vectors(vec_range, x_range, y_range)
	{
		let v = [];
		for (let y = y_range; y >= -y_range; --y)
		{
			for (let x = x_range; x >= -x_range; --x)
			{
				let p = [x, y];
				if (js_pcb.length_2d(p) > 0.1 && js_pcb.length_2d(p) <= vec_range)
				{
					v.push([x, y, 0]);
				}
			}
		}
		return v;
	}

	//args
	let pcb_data, arg_t, arg_v, arg_s, arg_z, arg_r, arg_q, arg_d, arg_fr, arg_xr, arg_yr;
	[pcb_data, arg_t, arg_v, arg_s, arg_z, arg_r, arg_q, arg_d, arg_fr, arg_xr, arg_yr] = paramater_array;

	//create flooding and backtracking vectors
	let flood_range = arg_fr;
	let flood_range_x_even_layer = arg_xr;
	let flood_range_y_odd_layer = arg_yr;
	let path_range = flood_range + 0;
	let path_range_x_even_layer = flood_range_x_even_layer + 0;
	let path_range_y_odd_layer = flood_range_y_odd_layer + 0;

	let routing_flood_vectorss =
			[gen_vectors(flood_range, flood_range_x_even_layer, flood_range),
			gen_vectors(flood_range, flood_range, flood_range_y_odd_layer)];

	let routing_path_vectorss =
			[gen_vectors(path_range, path_range_x_even_layer, path_range),
			gen_vectors(path_range, path_range, path_range_y_odd_layer)];

	//choose distance metric function
	let dfuncs = [js_pcb.manhattan_distance_3d,
				js_pcb.squared_euclidean_distance_3d,
				js_pcb.euclidean_distance_3d,
				js_pcb.chebyshev_distance_3d,
				js_pcb.reciprical_distance_3d];

	//create pcb object and populate with tracks from input
	let current_pcb = new js_pcb.Pcb(pcb_data[0], routing_flood_vectorss, routing_path_vectorss,
					dfuncs[arg_d], arg_r, arg_v, arg_q, arg_z);
	for (let track of pcb_data[1]) current_pcb.add_track(track);

	//run number of samples of solution and pick best one
	let best_pcb = current_pcb.output_pcb();
	postMessage(best_pcb);
	let best_cost = 1000000000;
	for (let i = 0; i < arg_s; ++i)
	{
		if (!current_pcb.route(arg_t))
		{
			current_pcb.increase_quantization();
			continue;
		}
		let cost = current_pcb.cost();
		if (cost <= best_cost)
		{
			best_cost = cost;
			best_pcb = current_pcb.output_pcb();
		}
	}
	postMessage(best_pcb);
}

//thread event listner
addEventListener('message', function(event)
{
	pcb_thread(event.data);
}, false);
