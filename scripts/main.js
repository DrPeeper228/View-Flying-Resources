var fancy = true;

const storageB= {
	topreg:null,
	botreg:null,
	randpos:[],
	shuffle:[],
	draw(){	
		if(!Core.settings.getBool("seethrough")){
			this.super$draw();
			return;
		}
		if(!this.topreg){
			this.loadreg();
		}
		Draw.rect(this.botreg, this.x, this.y);
		let total = this.items.total();
		if(total>0){
			let unique = this.items.sum((item,am)=>{
				return 1;
			});
			let spaces = Mathf.clamp( Math.max(unique,Math.ceil(total*0.1))-unique,0,this.block.size*10);
			let iiar = [];
			let rind = 0;
			this.items.each((item,am)=>{
				let occupy = Math.max(0,spaces*((am-10)/total));
				for(var ii = 0;ii<1+occupy;ii++){
					iiar[rind] = item;
					rind++;
				}
				spaces-=occupy;
				total-=am;
			});
			
			for(var tr = 0;tr<this.shuffle.length;tr++){
				if(iiar[this.shuffle[tr]]){
					Draw.rect(iiar[this.shuffle[tr]].icon(Cicon.medium), this.x+this.randpos[tr].x, this.y+this.randpos[tr].y, 5,5);
				}
			}
		}
		Draw.rect(this.topreg, this.x, this.y);
		this.drawTeamTop();
	},
	loadreg(){
		let alt = Core.atlas.find("xelos-pixel-texturepack-"+this.block.name);
		this.topreg = getRegion(alt,0,2,1);
		this.botreg = getRegion(alt,1,2,1);
		let s = this.block.size;
		for(var i = 0;i<=30+s*10;i++){
			this.randpos[i] = {x: Mathf.random(-s*2,s*2),y: Mathf.random(-s*2,s*2)};
		}
		let avail = [];
		for(var i = 0;i<s*10;i++){
			avail[i] = i;
		}
		for(var i = 0;i<s*10;i++){
			var rpos = Math.floor(Math.random(0,avail.length));
			this.shuffle[i]=avail[rpos];
			avail.splice(rpos,1);
		}
	}
};
const bridgeB={
	itemmove:[],
	moveindex:0,
	cap:6,
	
	
	
	create(block,team){
		this.super$create(block,team);
		this.items = extend(ItemModule,{
			onTake:null,
			take(){
				var itm = this.super$take();
				if(this.onTake){
					this.onTake.get(itm);
				}
				return itm;
			},
			setTakeCons(s){
				this.onTake=s;
			}
		});
		this.cap=6;
		if(this.block.bufferCapacity){
			this.cap=this.block.bufferCapacity;
		}
		this.items.setTakeCons(cons((item)=>{
			if(this.link!=-1){
				this.itemmove[this.moveindex] = {item:item, t:Time.time}
				this.moveindex = (this.moveindex+1)%this.cap;
			}
		}));
		return this;
	},
	draw(){
		this.super$draw();
		if(!Core.settings.getBool("seethrough")){
			return;
		}
		Draw.z(Layer.power);
		Draw.color();
		let other = Vars.world.tile(this.link);
		if(!this.block.linkValid(this.tile, other,true)){ return;}
		
		let opacity = Core.settings.getInt("bridgeopacity") / 100.0;
		if(Mathf.zero(opacity)) return;
		Draw.alpha(opacity);
		

		let i = this.tile.absoluteRelativeTo(other.x, other.y);
		
		let ex = other.worldx() - this.x;
        let ey = other.worldy() - this.y;
		let ttime = this.block.transportTime*10;
		if(this.block.bufferCapacity){
			ttime = this.block.transportTime*10+ 3600/this.block.speed;
		}
		for(var m = 0;m<this.itemmove.length;m++){
			if(this.itemmove[m] && this.itemmove[m].item && this.itemmove[m].t+ttime>Time.time){
				var tlerp = (Time.time-this.itemmove[m].t)/ttime;
				Draw.rect(this.itemmove[m].item.icon(Cicon.medium), this.x+ex*tlerp, this.y+ey*tlerp, 3,3);
			}
		}
		
		Draw.reset();
	}
}

var water;
var slag;
var flyingbuffer;
Events.run(Trigger.draw, () => {
	Draw.draw(Layer.flyingUnitLow-0.01, run(()=>{
		flyingbuffer.resize(Core.graphics.width, Core.graphics.height);
		flyingbuffer.begin(Color.clear);
	}));
	Draw.draw(Layer.flyingUnit+0.01, run(()=>{
		flyingbuffer.end();
		flyingbuffer.blit(Shaders.screenspace);
	}));

});
Events.on(EventType.ClientLoadEvent, 
cons(e => {
	
	Vars.ui.settings.graphics.checkPref("seethrough", Core.settings.getBool("seethrough"));
	Core.settings.defaults("seethrough", true);
	
	flyingbuffer = new FrameBuffer(Core.graphics.width, Core.graphics.height);
	
	initShader();

	Vars.content.getBy(ContentType.item).each(item=>{
		changeAtlasToSprite("item",item.name,item.icon(Cicon.medium));
	});
	
	Vars.content.getBy(ContentType.block).each(block=>{
		if(!(block instanceof BaseTurret) &&
		    !(block instanceof Conveyor) &&
			!(block instanceof PayloadConveyor) &&
			!(block instanceof LiquidBlock) &&
			!(block instanceof UnitFactory) &&
			!(block instanceof RepairPoint) &&
			!(block instanceof MassDriver) &&
			!(block instanceof Floor) &&
			!(block instanceof Drill) &&
			!(block instanceof LiquidConverter) &&
			!(block instanceof Cultivator)){
			changeAtlasToSprite("block",block.name,Core.atlas.find(block.name));
		}
	});
	Vars.content.getBy(ContentType.unit).each(unit=>{
		changeAtlasToSprite("unit",unit.name + "-outline",Core.atlas.find(unit.name) + "-outline");
	});
	
	Blocks.sporeMoss.blendGroup = Blocks.moss;
	
	
	
	Blocks.itemBridge.buildType = () =>{
		return extendContent(BufferedItemBridge.BufferedItemBridgeBuild, Blocks.itemBridge,deepCopy(bridgeB));
	}
	Blocks.phaseConveyor.buildType = () =>{
		return extendContent(ItemBridge.ItemBridgeBuild, Blocks.phaseConveyor,deepCopy(bridgeB));
	}
	
})
);

function addConsButton(table, consFunc, style, runnable) {
	let button = new Button(style);
	button.clearChildren();
	button.clicked(runnable);
	consFunc.get(button);
	return table.add(button);
}




if(!Vars.headless){
	var ut = new Table();

	/*Events.on(ClientLoadEvent, () => {
		var ut2 = new Table();
		ut.bottom().left();
		ut2.background(Styles.black5);
		let tblcons = cons((tbl)=>{
			//fancy
			tbl.clearChildren();
			addConsButton(
				tbl, 
				cons((butt) => {
					butt.top().left();
					butt.margin(12);
					butt.defaults().left().top();
					if(fancy){
						butt.add("[#aaffaa]Fancy:ON").size(170, 45); 
					}else{
						butt.add("[#ffaaaa]Fancy:OFF").size(170, 45); 
					}

				}),
				Styles.logict,
				() => { fancy = !fancy;  rebuild.run(); }
			);	
		});
		let rebuild = run(() => tblcons.get(ut2));
		rebuild.run();
		ut.add(ut2);
		if(Vars.mobile){
			ut.marginBottom(105);
		}
		Vars.ui.hudGroup.addChild(ut);
	});*/
}